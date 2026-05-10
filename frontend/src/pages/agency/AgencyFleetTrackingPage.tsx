/**
 * US_09 — Bản đồ giám sát hành trình thời gian thực (Agency).
 *
 * REST: `GET /api/trips/active-tracking` — Socket: `trip_gps_update` (đã lắng trong `AgencySocketProvider`).
 * Bản đồ: Leaflet + OSM (project chưa cài Mapbox; có thể thêm `VITE_MAPBOX_TOKEN` + layer Mapbox sau).
 */
import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Radio } from "lucide-react";
import { useAgencySocket } from "@/contexts/AgencySocketContext";
import { tripTrackingApi, unwrapActiveTracking } from "@/services/tripTrackingApi";
import type { ActiveTripTrackingRow } from "@/types/tripTracking";
import { getTripGpsSnapshot, pruneTripGpsStore, subscribeTripGps } from "@/lib/tripGpsLiveStore";
import { isFleetSignalStale, mergeActiveTripsWithLiveGps, type FleetTripView } from "@/lib/tripGpsMerge";
import { MapErrorBoundary } from "@/components/agency/fleet/MapErrorBoundary";
import { AgencyFleetLeafletMap } from "@/components/agency/fleet/AgencyFleetLeafletMap";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;
const CLOCK_MS = 10_000;

const FleetTripRow = memo(function FleetTripRow({ trip, nowMs }: { trip: FleetTripView; nowMs: number }) {
  const stale = isFleetSignalStale(trip.effective_last_signal_iso, nowMs);
  const hasPos = trip.latitude != null && trip.longitude != null;
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-sm shadow-sm transition-colors",
        stale ? "border-destructive/50 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <p className="font-extrabold text-foreground">{trip.license_plate || "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{trip.driver_name || "—"}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
        <Radio className={cn("size-3.5 shrink-0", stale ? "text-destructive animate-pulse" : "text-emerald-600")} />
        <span className={stale ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}>
          {stale ? "Mất tín hiệu" : hasPos ? "Đang có GPS" : "Chưa có điểm GPS"}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Mã: {trip.trip_code}</p>
    </div>
  );
});

export default function AgencyFleetTrackingPage() {
  const { agencySocketEnabled } = useAgencySocket();
  const [rows, setRows] = useState<ActiveTripTrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pulse, setPulse] = useState(0);

  const live = useSyncExternalStore(subscribeTripGps, getTripGpsSnapshot, getTripGpsSnapshot);

  const merged = useMemo(() => mergeActiveTripsWithLiveGps(rows, live), [rows, live]);

  const anyStale = useMemo(
    () => merged.some((t) => isFleetSignalStale(t.effective_last_signal_iso, nowTick)),
    [merged, nowTick],
  );

  const fetchActive = useCallback(async () => {
    try {
      const res = await tripTrackingApi.getActiveTracking();
      const list = unwrapActiveTracking(res);
      setRows(list);
      pruneTripGpsStore(new Set(list.map((r) => r.trip_id)));
    } catch {
      toast.error("Không tải được danh sách chuyến đang chạy.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActive();
  }, [fetchActive]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchActive(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchActive]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), CLOCK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!anyStale) return;
    const id = window.setInterval(() => setPulse((p) => p + 1), 900);
    return () => window.clearInterval(id);
  }, [anyStale]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 text-foreground">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Giám sát hành trình</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chuyến <span className="font-semibold">IN_PROGRESS</span>, vị trí cập nhật qua Socket{" "}
          <code className="rounded bg-muted px-1 text-xs">trip_gps_update</code>
          {!agencySocketEnabled ? " (đang tắt kết nối socket — chỉ dữ liệu REST)." : null}
        </p>
      </div>

      <div className="flex min-h-[520px] flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="flex w-full shrink-0 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-card p-3 lg:w-[300px]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <MapPin className="size-4" />
            Đang chạy ({rows.length})
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Đang tải…</span>
            </div>
          ) : merged.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Không có chuyến IN_PROGRESS.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {merged.map((t) => (
                <FleetTripRow key={t.trip_id} trip={t} nowMs={nowTick} />
              ))}
            </div>
          )}
        </aside>

        <div className="relative min-h-[480px] flex-1 min-w-0 overflow-hidden rounded-xl border border-border bg-muted/20">
          <MapErrorBoundary>
            <AgencyFleetLeafletMap trips={merged} nowMs={nowTick} pulse={pulse} />
          </MapErrorBoundary>
        </div>
      </div>
    </div>
  );
}
