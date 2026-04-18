import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DriverPortalTrip } from "@/types/driverPortal";
import type { TripStatusCode } from "@/types/trip";
import { TRIP_STATUS_LABEL, tripStatusBadgeCnForDriver } from "@/lib/tripStatusDisplay";
import { cn } from "@/lib/utils";

type DriverTripCardProps = {
  trip: DriverPortalTrip;
  onOpen: (trip: DriverPortalTrip) => void;
};

function formatDeparture(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DriverTripCard({ trip, onOpen }: DriverTripCardProps) {
  const status = trip.status as TripStatusCode;
  const label = TRIP_STATUS_LABEL[status] ?? trip.status;

  return (
    <button
      type="button"
      onClick={() => onOpen(trip)}
      className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f172a]"
    >
      <Card
        className={cn(
          "overflow-hidden border border-slate-200/90 bg-white shadow-sm transition-all duration-200",
          "hover:border-slate-300 hover:shadow-md active:scale-[0.99]",
          "dark:border-slate-600/60 dark:bg-[#1e293b]",
          "border-l-4 border-l-blue-600 dark:border-l-blue-500",
        )}
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100">
              {trip.route.name}
            </h3>
            <Badge variant="outline" className={tripStatusBadgeCnForDriver(status)}>
              {label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
              {trip.vehicle.license_plate}
            </span>
            <span>{formatDeparture(trip.departure_time)}</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Mã chuyến · {trip.trip_code}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}
