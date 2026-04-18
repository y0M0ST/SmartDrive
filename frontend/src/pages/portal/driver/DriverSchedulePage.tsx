import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { driverApi, unwrapDriverMyTrips } from "@/services/driverApi";
import { provinceApi, type VietnamProvinceDto } from "@/services/provinceApi";
import type { DriverPortalTrip } from "@/types/driverPortal";
import { DriverTripCard } from "@/components/driver-portal/DriverTripCard";
import { DriverTripDetailDialog } from "@/components/driver-portal/DriverTripDetailDialog";
import { cn } from "@/lib/utils";

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
      <p className="text-[13px] font-medium tracking-tight text-slate-400 dark:text-slate-500">
        Chưa có lịch
      </p>
      <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-slate-400/90 dark:text-slate-500">
        Hiện tại bác tài chưa có lịch chạy. Hãy nghỉ ngơi nhé!
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

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

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
            upcoming.map((t) => <DriverTripCard key={t.id} trip={t} onOpen={openDetail} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 w-full min-w-0 space-y-3 outline-none">
          {loading ? (
            <p className="py-12 text-center text-xs font-medium text-slate-400">Đang tải…</p>
          ) : history.length === 0 ? (
            <EmptyTrips />
          ) : (
            history.map((t) => <DriverTripCard key={t.id} trip={t} onOpen={openDetail} />)
          )}
        </TabsContent>
      </Tabs>

      <DriverTripDetailDialog
        open={detailOpen}
        onOpenChange={onDetailOpenChange}
        trip={detailTrip}
        resolveProvinceName={resolveProvinceName}
      />
    </div>
  );
}
