import { Camera, Phone, Play, ShieldAlert } from "lucide-react";
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
import { TRIP_STATUS_LABEL, tripStatusBadgeCnForDriver } from "@/lib/tripStatusDisplay";

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
}: DriverTripDetailDialogProps) {
  if (!trip) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const status = trip.status as TripStatusCode;
  const routeLine = `${resolveProvinceName(trip.route.start_point)} → ${resolveProvinceName(trip.route.end_point)}`;
  const callHref = telHref(trip.agency.phone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[480px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-lg leading-snug">{trip.route.name}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className={tripStatusBadgeCnForDriver(status)}>
              {TRIP_STATUS_LABEL[status] ?? trip.status}
            </Badge>
            <span className="font-mono text-sm text-muted-foreground">{trip.trip_code}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lộ trình</h4>
            <p className="mt-1 font-medium text-foreground">{routeLine}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {trip.route.distance_km} km · dự kiến ~{trip.route.estimated_hours} giờ
            </p>
          </section>

          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Xe</h4>
            <p className="mt-1 font-semibold text-foreground">{trip.vehicle.license_plate}</p>
            <p className="text-xs text-muted-foreground">
              Loại: {trip.vehicle.type} · Trạng thái: {trip.vehicle.status}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nhà xe</h4>
            <p className="mt-1 font-semibold text-foreground">{trip.agency.name}</p>
            {trip.agency.address ? (
              <p className="mt-1 text-xs text-muted-foreground">{trip.agency.address}</p>
            ) : null}
            {trip.agency.phone ? (
              <p className="mt-1 font-mono text-sm text-foreground">{trip.agency.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Chưa có số điện thoại liên hệ.</p>
            )}
          </section>

          <section className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Xuất bến:</span> {formatIso(trip.departure_time)}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-foreground">Dự kiến tới bến:</span>{" "}
              {formatIso(trip.planned_end_time)}
            </p>
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
