import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Car, Loader2, MapPin, Phone, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tripApi } from "@/services/tripApi";
import type { TripDetail, TripStatusCode } from "@/types/trip";
import { TRIP_STATUS_LABEL, tripStatusBadgeCn } from "@/lib/tripStatusDisplay";
import { cn } from "@/lib/utils";

const POLL_MS = 10_000;

const VIOLATION_TYPE_LABEL: Record<string, string> = {
  DROWSY: "Ngủ gật",
  DISTRACTED: "Mất tập trung",
};

function violationTypeLabel(type: string): string {
  return VIOLATION_TYPE_LABEL[type] ?? type;
}

function unwrapTripDetail(res: unknown): TripDetail | null {
  const d = (res as { data?: { data?: TripDetail } })?.data?.data;
  return d && typeof d === "object" ? d : null;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isTripStatus(s: string): s is TripStatusCode {
  return ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(s);
}

type TripDetailModalProps = {
  open: boolean;
  tripId: string | null;
  onOpenChange: (open: boolean) => void;
  resolveProvinceName: (code: string) => string;
};

export default function TripDetailModal({
  open,
  tripId,
  onOpenChange,
  resolveProvinceName,
}: TripDetailModalProps) {
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "violations">("general");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pollFailNotified = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const loadDetail = useCallback(async (opts?: { silent?: boolean }) => {
    if (!tripId) return;
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setLoading(true);
      pollFailNotified.current = false;
    }
    try {
      const res = await tripApi.getDetail(tripId);
      const data = unwrapTripDetail(res);
      if (!data) {
        if (!silent) toast.error("Dữ liệu chuyến đi không hợp lệ.");
        setDetail(null);
        return;
      }
      setDetail(data);
      pollFailNotified.current = false;
    } catch (e) {
      if (!silent) {
        setDetail(null);
        if (e instanceof AxiosError) {
          if (e.response?.status === 403) {
            toast.error("Bạn không có quyền xem chuyến đi này.");
          } else if (e.response?.status === 404) {
            toast.error("Không tìm thấy chuyến đi.");
          } else {
            toast.error("Không tải được chi tiết chuyến đi.");
          }
        } else {
          toast.error("Không tải được chi tiết chuyến đi.");
        }
        onOpenChangeRef.current(false);
      } else if (!pollFailNotified.current) {
        pollFailNotified.current = true;
        toast.error("Không cập nhật được dữ liệu chuyến (polling).");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!open || !tripId) {
      setDetail(null);
      return;
    }
    setActiveTab("general");
    void loadDetail();
  }, [open, tripId, loadDetail]);

  useEffect(() => {
    if (!open || !tripId || detail?.status !== "IN_PROGRESS") return;
    const id = window.setInterval(() => {
      void loadDetail({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [open, tripId, detail?.status, loadDetail]);

  const status = detail?.status && isTripStatus(detail.status) ? detail.status : null;
  const route = detail?.route;
  const routeLabel = route
    ? `${resolveProvinceName(route.start_point)} → ${resolveProvinceName(route.end_point)}`
    : "—";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setPreviewUrl(null);
          onOpenChange(v);
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {loading ? (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight">Chi tiết chuyến đi</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-[220px] flex-1 items-center justify-center text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin opacity-70" />
              </div>
            </>
          ) : !detail ? (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight">Chi tiết chuyến đi</DialogTitle>
              </DialogHeader>
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">Không có dữ liệu.</p>
            </>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "general" | "violations")}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="shrink-0 border-b border-border bg-background">
                <DialogHeader className="px-6 py-4 text-left">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <DialogTitle className="text-xl font-bold tracking-tight">
                        Chi tiết chuyến đi
                      </DialogTitle>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">{detail.trip_code}</p>
                    </div>
                    {status ? (
                      <Badge variant="outline" className={tripStatusBadgeCn(status)}>
                        {TRIP_STATUS_LABEL[status]}
                      </Badge>
                    ) : null}
                  </div>
                  {detail.status === "IN_PROGRESS" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Đang chạy — tự làm mới dữ liệu mỗi {POLL_MS / 1000}s (vi phạm mới nhất).
                    </p>
                  ) : null}
                </DialogHeader>

                <TabsList
                  variant="line"
                  className="h-11 w-full justify-start gap-0 rounded-none border-0 border-t border-border/60 bg-transparent px-6"
                >
                  <TabsTrigger
                    value="general"
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 data-[state=active]:border-b-primary data-[state=active]:font-bold data-[state=active]:text-foreground"
                  >
                    Thông tin chung
                  </TabsTrigger>
                  <TabsTrigger
                    value="violations"
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 data-[state=active]:border-b-primary data-[state=active]:font-bold data-[state=active]:text-foreground"
                  >
                    Nhật ký vi phạm
                    {detail.ai_violations?.length ? (
                      <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground data-[state=active]:bg-primary/10">
                        {detail.ai_violations.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <TabsContent
                  value="general"
                  forceMount
                  className="mt-0 space-y-6 pt-1 outline-none transition-opacity duration-200 data-[state=inactive]:pointer-events-none data-[state=inactive]:hidden data-[state=inactive]:opacity-0 data-[state=active]:opacity-100"
                >
                  <section className="rounded-xl border border-border bg-muted/30 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Tuyến đường
                    </h3>
                    <p className="text-lg font-semibold text-foreground">{routeLabel}</p>
                    {route?.name ? <p className="text-sm text-muted-foreground">{route.name}</p> : null}
                    {typeof route?.distance_km === "number" ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Cự ly: <span className="font-medium text-foreground">{route.distance_km} km</span>
                        {typeof route.estimated_hours === "number"
                          ? ` · Dự kiến: ${route.estimated_hours} giờ`
                          : null}
                      </p>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-border bg-muted/30 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      <Car className="h-4 w-4" />
                      Phương tiện
                    </h3>
                    <p className="font-mono text-lg font-semibold">{detail.vehicle?.license_plate ?? "—"}</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {detail.vehicle?.type ? (
                        <p>
                          Loại: <span className="text-foreground">{detail.vehicle.type}</span>
                        </p>
                      ) : null}
                      {typeof detail.vehicle?.capacity === "number" ? (
                        <p>
                          Số chỗ: <span className="text-foreground">{detail.vehicle.capacity}</span>
                        </p>
                      ) : null}
                      <p>
                        Camera ID:{" "}
                        <span className="font-mono text-foreground">
                          {detail.vehicle?.ai_camera_id?.trim()
                            ? detail.vehicle.ai_camera_id
                            : "Chưa gắn"}
                        </span>
                      </p>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-muted/30 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      <User className="h-4 w-4" />
                      Tài xế
                    </h3>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div
                        className={cn(
                          "flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-2xl font-bold text-foreground shadow-sm",
                        )}
                        aria-hidden
                      >
                        {(detail.driver?.full_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-lg font-semibold text-foreground">
                          {detail.driver?.full_name ?? "—"}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a
                            href={detail.driver?.phone ? `tel:${detail.driver.phone}` : undefined}
                            className={cn(
                              "truncate",
                              detail.driver?.phone
                                ? "font-medium text-foreground underline-offset-2 hover:underline"
                                : "",
                            )}
                          >
                            {detail.driver?.phone ?? "—"}
                          </a>
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      Thời gian dự kiến & thực tế
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Xuất bến (dự kiến)</p>
                        <p className="text-sm font-semibold">{formatDateTime(detail.departure_time)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Tới bến (dự kiến)</p>
                        <p className="text-sm font-semibold">{formatDateTime(detail.planned_end_time)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Xuất bến (thực tế)</p>
                        <p className="text-sm font-semibold">{formatDateTime(detail.actual_start_time)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Tới bến (thực tế)</p>
                        <p className="text-sm font-semibold">{formatDateTime(detail.actual_end_time)}</p>
                      </div>
                    </div>
                    {detail.cancel_reason ? (
                      <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        Lý do hủy: {detail.cancel_reason}
                      </p>
                    ) : null}
                  </section>
                </TabsContent>

                <TabsContent
                  value="violations"
                  forceMount
                  className="mt-0 pt-1 outline-none transition-opacity duration-200 data-[state=inactive]:pointer-events-none data-[state=inactive]:hidden data-[state=inactive]:opacity-0 data-[state=active]:opacity-100"
                >
                  <div className="rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[200px]">Thời gian</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead className="w-[100px]">Ảnh</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!detail.ai_violations?.length ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                              Chưa có vi phạm AI ghi nhận cho chuyến này.
                            </TableCell>
                          </TableRow>
                        ) : (
                          detail.ai_violations.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDateTime(v.occurred_at)}
                              </TableCell>
                              <TableCell className="font-medium">{violationTypeLabel(v.type)}</TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  className="group relative block overflow-hidden rounded-md border border-border ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                  onClick={() => setPreviewUrl(v.image_url)}
                                  title="Xem ảnh đầy đủ"
                                >
                                  <img
                                    src={v.image_url}
                                    alt=""
                                    className="h-14 w-14 object-cover transition group-hover:opacity-90"
                                  />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewUrl)} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent className="max-w-[min(96vw,900px)] border border-border bg-card p-2 sm:max-w-[900px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Ảnh vi phạm</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vi phạm — ảnh đầy đủ"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
