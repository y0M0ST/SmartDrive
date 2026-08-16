import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX, Camera, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { driverApi, unwrapDriverMyTrips, unwrapFaceTemplate } from "@/services/driverApi";
import {
  FACE_TEMPLATE_NOT_REGISTERED_CODE,
  isDriverProfileNotFoundError,
  NO_DRIVER_PROFILE_MESSAGE,
  parseDriverFaceApiError,
} from "@/lib/faceApiErrors";
import { provinceApi, type VietnamProvinceDto } from "@/services/provinceApi";
import type { DriverPortalTrip } from "@/types/driverPortal";
import { DriverTripCard } from "@/components/driver-portal/DriverTripCard";
import { DriverTripDetailDialog } from "@/components/driver-portal/DriverTripDetailDialog";
import { FaceScannerModal, type FaceScannerMode } from "@/components/driver-portal/FaceScannerModal";
import ConfirmModal from "@/components/ConfirmModal";
import { cn } from "@/lib/utils";

function getApiMessage(error: unknown): string {
  const ax = error as { response?: { data?: { message?: string } } };
  const msg = ax.response?.data?.message;
  return typeof msg === "string" && msg.trim() !== "" ? msg : "Không thực hiện được. Vui lòng thử lại.";
}

function unwrapProvinceList(res: { data?: { data?: VietnamProvinceDto[] } }): VietnamProvinceDto[] {
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

function isUpcoming(t: DriverPortalTrip): boolean {
  return t.status === "SCHEDULED" || t.status === "IN_PROGRESS";
}

function sortUpcomingTrips(list: DriverPortalTrip[]): DriverPortalTrip[] {
  return [...list].sort((a, b) => {
    const aLive = a.status === "IN_PROGRESS" ? 1 : 0;
    const bLive = b.status === "IN_PROGRESS" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
  });
}

function isHistory(t: DriverPortalTrip): boolean {
  return t.status === "COMPLETED" || t.status === "CANCELLED";
}

function EmptyTrips() {
  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center px-4 py-16 text-center">
      <CalendarX className="mb-4 size-12 text-slate-300 dark:text-slate-600" strokeWidth={1.25} aria-hidden />
      <p className="text-[13px] font-semibold tracking-tight text-slate-600 dark:text-slate-400">
        Chưa có lịch được phân công
      </p>
      <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-slate-400/90 dark:text-slate-500">
        Khi nhà xe xếp chuyến, lịch sẽ hiển thị ở đây. Hãy nghỉ ngơi hoặc liên hệ điều hành nếu bạn đang chờ lịch.
      </p>
    </div>
  );
}

export default function DriverSchedulePage() {
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState<VietnamProvinceDto[]>([]);
  const [detailTrip, setDetailTrip] = useState<DriverPortalTrip | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  /** `null` = đang kiểm tra hoặc lỗi mạng (không phân biệt được). */
  const [hasFaceTemplate, setHasFaceTemplate] = useState<boolean | null>(null);
  /** `false` = chưa có `driver_profiles` trên BE. */
  const [hasDriverProfile, setHasDriverProfile] = useState<boolean | null>(null);
  /** Điểm danh Face ID bị khóa (US_18) — từ GET mẫu khuôn mặt. */
  const [faceCheckinLocked, setFaceCheckinLocked] = useState(false);
  const [faceScannerOpen, setFaceScannerOpen] = useState(false);
  const [faceScannerMode, setFaceScannerMode] = useState<FaceScannerMode>("register");
  const [faceScannerTripId, setFaceScannerTripId] = useState<string | undefined>(undefined);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [tripToComplete, setTripToComplete] = useState<DriverPortalTrip | null>(null);
  const [completingTrip, setCompletingTrip] = useState(false);

  const provinceByCode = useMemo(() => {
    const m = new Map<string, VietnamProvinceDto>();
    provinces.forEach((p) => m.set(p.code, p));
    return m;
  }, [provinces]);

  const resolveProvinceName = useCallback(
    (code: string) => provinceByCode.get(code)?.name ?? code,
    [provinceByCode],
  );

  const upcoming = useMemo(() => sortUpcomingTrips(trips.filter(isUpcoming)), [trips]);
  const history = useMemo(() => trips.filter(isHistory), [trips]);

  const activeInProgressTrip = useMemo(
    () => trips.find((t) => t.status === "IN_PROGRESS") ?? null,
    [trips],
  );
  const hasActiveInProgressTrip = activeInProgressTrip != null;

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driverApi.getMyTrips({ page: 1, limit: 100 });
      const parsed = unwrapDriverMyTrips(res);
      if (!parsed) {
        setTrips([]);
        return;
      }
      setTrips(parsed.data);
    } catch {
      toast.error("Không tải được lịch chạy. Thử lại sau nhé!");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFaceTemplate = useCallback(async () => {
    try {
      const res = await driverApi.getFaceTemplate();
      const parsed = unwrapFaceTemplate(res);
      if (parsed) {
        setHasDriverProfile(true);
        setHasFaceTemplate(true);
        setFaceCheckinLocked(!!parsed.is_locked);
      } else {
        setHasDriverProfile(null);
        setHasFaceTemplate(null);
        setFaceCheckinLocked(false);
      }
    } catch (e: unknown) {
      if (isDriverProfileNotFoundError(e)) {
        setHasDriverProfile(false);
        setHasFaceTemplate(false);
        setFaceCheckinLocked(false);
        return;
      }
      const parsed = parseDriverFaceApiError(e);
      if (parsed.status === 404 && parsed.errorCode === FACE_TEMPLATE_NOT_REGISTERED_CODE) {
        setHasDriverProfile(true);
        setHasFaceTemplate(false);
        setFaceCheckinLocked(false);
        return;
      }
      setHasDriverProfile(null);
      setHasFaceTemplate(null);
      setFaceCheckinLocked(false);
    }
  }, []);

  const onFaceFlowComplete = useCallback(() => {
    void loadTrips();
    void refreshFaceTemplate();
  }, [loadTrips, refreshFaceTemplate]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    void refreshFaceTemplate();
  }, [refreshFaceTemplate]);

  useEffect(() => {
    (async () => {
      try {
        const res = await provinceApi.list();
        setProvinces(unwrapProvinceList(res));
      } catch {
        setProvinces([]);
      }
    })();
  }, []);

  const openDetail = useCallback((t: DriverPortalTrip) => {
    setDetailTrip(t);
    setDetailOpen(true);
  }, []);

  const onDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) setDetailTrip(null);
  }, []);

  const openFaceRegister = useCallback(() => {
    if (faceCheckinLocked) {
      toast.error("Điểm danh khuôn mặt đang bị khóa. Vui lòng liên hệ nhà xe để được mở khóa.");
      return;
    }
    setFaceScannerMode("register");
    setFaceScannerTripId(undefined);
    setFaceScannerOpen(true);
  }, [faceCheckinLocked]);

  const handleRegisterFaceFromDialog = useCallback(() => {
    setDetailOpen(false);
    setDetailTrip(null);
    openFaceRegister();
  }, [openFaceRegister]);

  const handleStartTripFromDialog = useCallback(
    (trip: DriverPortalTrip) => {
      if (faceCheckinLocked) {
        toast.error("Điểm danh khuôn mặt đang bị khóa. Vui lòng liên hệ nhà xe để được mở khóa.");
        return;
      }
      if (hasActiveInProgressTrip) {
        toast.error(
          `Chuyến ${activeInProgressTrip?.trip_code || "đang chạy"} chưa kết thúc. Vui lòng kết thúc chuyến cũ trước khi bắt đầu chuyến mới.`,
          { duration: 8000 },
        );
        return;
      }
      setDetailOpen(false);
      setDetailTrip(null);
      setFaceScannerMode("checkin");
      setFaceScannerTripId(trip.id);
      setFaceScannerOpen(true);
    },
    [faceCheckinLocked, hasActiveInProgressTrip, activeInProgressTrip?.trip_code],
  );

  const handleRequestCompleteTrip = useCallback((trip: DriverPortalTrip) => {
    setDetailOpen(false);
    setDetailTrip(null);
    setTripToComplete(trip);
    setCompleteConfirmOpen(true);
  }, []);

  const handleConfirmCompleteTrip = useCallback(async () => {
    if (!tripToComplete || completingTrip) return;
    setCompletingTrip(true);
    try {
      await driverApi.completeTrip(tripToComplete.id);
      toast.success("Đã kết thúc chuyến đi. Bạn có thể nhận chuyến mới khi được phân công.");
      setCompleteConfirmOpen(false);
      setTripToComplete(null);
      setDetailOpen(false);
      setDetailTrip(null);
      await loadTrips();
    } catch (error: unknown) {
      toast.error(getApiMessage(error));
    } finally {
      setCompletingTrip(false);
    }
  }, [tripToComplete, completingTrip, loadTrips]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl md:font-black md:tracking-tight">
          Lịch chạy
        </h1>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 md:mt-1 md:text-base md:text-slate-600 md:dark:text-slate-400">
          Chuyến đang chạy lên đầu tab Sắp tới. Trên điện thoại chạm thẻ; trên máy tính bấm thẻ để xem chi tiết và gọi nhà xe.
        </p>
      </div>

      {faceCheckinLocked ? (
        <div
          className={cn(
            "flex gap-3 rounded-xl border-4 border-red-800 bg-red-950 p-4 text-red-50 shadow-md",
            "dark:border-red-700 dark:bg-red-950",
          )}
          role="alert"
        >
          <ShieldAlert className="mt-0.5 size-8 shrink-0 text-red-400" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-red-100">Điểm danh bị khóa</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-red-100/95">
              Tài khoản bị tạm khóa điểm danh khuôn mặt do thử sai quá nhiều lần. Vui lòng liên hệ bộ phận vận hành
              (Agency) để được mở khóa trước khi chạy chuyến.
            </p>
          </div>
        </div>
      ) : null}

      {hasDriverProfile === false && !faceCheckinLocked ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-xl border border-sky-200/90 bg-sky-50/95 p-4 shadow-sm",
            "dark:border-sky-900/50 dark:bg-sky-950/40",
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">Chưa có hồ sơ tài xế</p>
            <p className="mt-1 text-xs leading-relaxed text-sky-900/90 dark:text-sky-200/90">{NO_DRIVER_PROFILE_MESSAGE}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 gap-2 border-sky-300/80 bg-white/90 text-sky-950 hover:bg-white dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-50"
            onClick={openFaceRegister}
          >
            <Camera className="size-4" aria-hidden />
            Thử quét camera
          </Button>
        </div>
      ) : hasFaceTemplate === false && hasDriverProfile !== false && !faceCheckinLocked ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-xl border border-amber-200/90 bg-amber-50/95 p-4 shadow-sm",
            "dark:border-amber-900/50 dark:bg-amber-950/40",
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Đăng ký khuôn mặt</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/85 dark:text-amber-200/90">
              Bạn chưa có mẫu khuôn mặt trên hệ thống. Đăng ký một lần để có thể điểm danh bằng camera trước khi xuất bến.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 gap-2 border-amber-300/80 bg-white/90 text-amber-950 hover:bg-white dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-50"
            onClick={openFaceRegister}
          >
            <Camera className="size-4" aria-hidden />
            Đăng ký khuôn mặt
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList
          className={cn(
            "grid h-10 w-full grid-cols-2 rounded-xl p-0.5",
            "bg-white/90 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-600/50",
          )}
        >
          <TabsTrigger
            value="upcoming"
            className="rounded-lg text-xs font-semibold data-active:bg-blue-600 data-active:text-white data-active:shadow-sm dark:data-active:bg-blue-500"
          >
            Sắp tới
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-lg text-xs font-semibold data-active:bg-blue-600 data-active:text-white data-active:shadow-sm dark:data-active:bg-blue-500"
          >
            Lịch sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 w-full min-w-0 space-y-3 outline-none">
          {loading ? (
            <p className="py-12 text-center text-xs font-medium text-slate-400">Đang tải…</p>
          ) : upcoming.length === 0 ? (
            <EmptyTrips />
          ) : (
            upcoming.map((t) => (
              <DriverTripCard key={t.id} trip={t} resolveProvinceName={resolveProvinceName} onOpen={openDetail} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 w-full min-w-0 space-y-3 outline-none">
          {loading ? (
            <p className="py-12 text-center text-xs font-medium text-slate-400">Đang tải…</p>
          ) : history.length === 0 ? (
            <EmptyTrips />
          ) : (
            history.map((t) => (
              <DriverTripCard key={t.id} trip={t} resolveProvinceName={resolveProvinceName} onOpen={openDetail} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <DriverTripDetailDialog
        open={detailOpen}
        onOpenChange={onDetailOpenChange}
        trip={detailTrip}
        resolveProvinceName={resolveProvinceName}
        hasFaceTemplate={hasFaceTemplate}
        hasDriverProfile={hasDriverProfile}
        faceCheckinLocked={faceCheckinLocked}
        hasActiveInProgressTrip={hasActiveInProgressTrip}
        activeInProgressTripCode={activeInProgressTrip?.trip_code}
        onRegisterFace={handleRegisterFaceFromDialog}
        onStartTrip={handleStartTripFromDialog}
        onCompleteTrip={handleRequestCompleteTrip}
      />

      <ConfirmModal
        isOpen={completeConfirmOpen}
        onClose={() => {
          if (completingTrip) return;
          setCompleteConfirmOpen(false);
          setTripToComplete(null);
        }}
        onConfirm={() => void handleConfirmCompleteTrip()}
        title="Kết thúc chuyến đi"
        message="Bạn có chắc chắn muốn kết thúc hành trình này không"
        itemName=""
        suffix="Hành động này không thể hoàn tác."
        confirmLabel="Xác nhận kết thúc"
      />

      <FaceScannerModal
        open={faceScannerOpen}
        onOpenChange={setFaceScannerOpen}
        mode={faceScannerMode}
        tripId={faceScannerTripId}
        onComplete={onFaceFlowComplete}
      />
    </div>
  );
}
