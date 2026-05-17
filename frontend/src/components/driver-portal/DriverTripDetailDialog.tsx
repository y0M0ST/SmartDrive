import { Camera, Phone, Play, ShieldAlert, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DriverPortalTrip } from "@/types/driverPortal";
import type { TripStatusCode } from "@/types/trip";
import { tripStatusBadgeCnForDriver, tripStatusLabel } from "@/lib/tripStatusDisplay";
import { vehicleStatusLabel, vehicleTypeLabel } from "@/lib/vehicleDisplay";

type DriverTripDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: DriverPortalTrip | null;
  resolveProvinceName: (code: string) => string;
  /** `null` = đang kiểm tra với BE. */
  hasFaceTemplate: boolean | null;
  /** Điểm danh Face ID bị khóa (US_18). */
  faceCheckinLocked: boolean;
  onRegisterFace: () => void;
  onStartTrip: (trip: DriverPortalTrip) => void;
  onCompleteTrip: (trip: DriverPortalTrip) => void;
};

function formatIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function telHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function DriverTripDetailDialog({
  open,
  onOpenChange,
  trip,
  resolveProvinceName,
  hasFaceTemplate,
  faceCheckinLocked,
  onRegisterFace,
  onStartTrip,
  onCompleteTrip,
}: DriverTripDetailDialogProps) {
  if (!trip) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const status = trip.status as TripStatusCode;
  const startPoint = trip.route?.start_point ?? "";
  const endPoint = trip.route?.end_point ?? "";
  const routeLine =
    startPoint || endPoint
      ? `${resolveProvinceName(startPoint)} → ${resolveProvinceName(endPoint)}`
      : "Chưa cập nhật";
  const callHref = telHref(trip.agency?.phone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[480px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-lg leading-snug">{trip.route?.name || "Chưa cập nhật"}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className={tripStatusBadgeCnForDriver(status)}>
              {tripStatusLabel(status)}
            </Badge>
            <span className="font-mono text-sm text-muted-foreground">{trip.trip_code || "Chưa cập nhật"}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lộ trình</h4>
            <p className="mt-1 font-medium text-foreground">{routeLine}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {trip.route?.distance_km != null ? `${trip.route.distance_km} km` : "Chưa cập nhật"} · dự kiến ~
              {trip.route?.estimated_hours != null ? ` ${trip.route.estimated_hours} giờ` : " Chưa cập nhật"}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Xe</h4>
            <p className="mt-1 font-semibold text-foreground">{trip.vehicle?.license_plate || "Chưa cập nhật"}</p>
            <p className="text-xs text-muted-foreground">
              Loại: {vehicleTypeLabel(trip.vehicle?.type)} · Trạng thái:{" "}
              {vehicleStatusLabel(trip.vehicle?.status)}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nhà xe / Đại lý</h4>
            <p className="mt-1 font-semibold text-foreground">{trip.agency?.name || "Chưa cập nhật"}</p>
            {trip.agency?.code ? (
              <p className="text-xs text-muted-foreground">Mã: {trip.agency.code}</p>
            ) : null}
            {trip.agency?.address ? (
              <p className="mt-1 text-xs text-muted-foreground">{trip.agency.address}</p>
            ) : null}
            {trip.agency?.phone ? (
              <p className="mt-1 font-mono text-sm text-foreground">{trip.agency.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Chưa có số điện thoại liên hệ.</p>
            )}
          </section>

          <section className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Xuất bến (dự kiến):</span>{" "}
              {formatIso(trip.departure_time)}
            </p>
            {trip.actual_start_time ? (
              <p className="mt-1">
                <span className="font-semibold text-foreground">Xuất bến (thực tế):</span>{" "}
                {formatIso(trip.actual_start_time)}
              </p>
            ) : null}
            <p className="mt-1">
              <span className="font-semibold text-foreground">Tới bến (dự kiến):</span>{" "}
              {formatIso(trip.planned_end_time)}
            </p>
            {trip.actual_end_time ? (
              <p className="mt-1">
                <span className="font-semibold text-foreground">Tới bến (thực tế):</span>{" "}
                {formatIso(trip.actual_end_time)}
              </p>
            ) : null}
            {trip.cancel_reason ? (
              <p className="mt-2 text-rose-600 dark:text-rose-400">Lý do hủy: {trip.cancel_reason}</p>
            ) : null}
          </section>

          {faceCheckinLocked ? (
            <section
              className="flex gap-3 rounded-xl border-4 border-red-800 bg-red-950 p-3 text-red-50 shadow-inner"
              role="alert"
            >
              <ShieldAlert className="mt-0.5 size-7 shrink-0 text-red-400" strokeWidth={2} aria-hidden />
              <p className="text-xs font-semibold leading-relaxed">
                Điểm danh khuôn mặt đang bị khóa. Liên hệ nhà xe / Agency để mở khóa trước khi bắt đầu chuyến.
              </p>
            </section>
          ) : null}

          <div className="flex flex-col gap-2">
            {hasFaceTemplate === false && !faceCheckinLocked ? (
              <Button type="button" className="w-full gap-2" variant="secondary" onClick={onRegisterFace}>
                <Camera className="size-4" aria-hidden />
                Đăng ký khuôn mặt
              </Button>
            ) : null}

            {trip.status === "SCHEDULED" ? (
              <Button
                type="button"
                className="w-full gap-2"
                disabled={hasFaceTemplate !== true || faceCheckinLocked}
                onClick={() => onStartTrip(trip)}
                title={
                  faceCheckinLocked
                    ? "Điểm danh khuôn mặt đang bị khóa. Liên hệ nhà xe để mở khóa."
                    : hasFaceTemplate !== true
                      ? "Vui lòng đăng ký khuôn mặt trước khi bắt đầu chuyến."
                      : undefined
                }
              >
                <Play className="size-4" aria-hidden />
                Bắt đầu chuyến đi
              </Button>
            ) : null}

            {trip.status === "IN_PROGRESS" ? (
              <Button
                type="button"
                className="w-full gap-2 bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-500"
                onClick={() => onCompleteTrip(trip)}
              >
                <Square className="size-4" aria-hidden />
                Kết thúc chuyến đi
              </Button>
            ) : null}
          </div>

          {callHref ? (
            <Button type="button" className="w-full gap-2" asChild>
              <a href={callHref}>
                <Phone className="size-4" aria-hidden />
                Gọi cho nhà xe
              </a>
            </Button>
          ) : (
            <Button type="button" className="w-full" disabled variant="secondary">
              Gọi cho nhà xe (chưa có SĐT)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
