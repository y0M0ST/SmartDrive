import type { ActiveTripTrackingRow, TripGpsSocketPayload } from "@/types/tripTracking";

export type FleetTripView = ActiveTripTrackingRow & {
  /** ISO mới nhất giữa REST `last_signal_time` và socket `recorded_at`. */
  effective_last_signal_iso: string | null;
};

function latestIso(a: string | null, b: string | null | undefined): string | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (Number.isNaN(ta) && Number.isNaN(tb)) return null;
  if (Number.isNaN(ta)) return b ?? null;
  if (Number.isNaN(tb)) return a;
  return ta >= tb ? a : (b as string);
}

export function mergeActiveTripsWithLiveGps(
  rows: ActiveTripTrackingRow[],
  live: Record<string, TripGpsSocketPayload & { _receivedAtMs?: number }>,
): FleetTripView[] {
  return rows.map((r) => {
    const g = live[r.trip_id];
    const lat = g?.latitude ?? r.latitude;
    const lng = g?.longitude ?? r.longitude;
    const speed = g?.speed ?? r.speed;
    const heading = g ? g.heading : r.heading;
    const effective = latestIso(r.last_signal_time, g?.recorded_at);
    return {
      ...r,
      latitude: lat,
      longitude: lng,
      speed,
      heading,
      effective_last_signal_iso: effective,
    };
  });
}

/** `true` khi không có tín hiệu hoặc quá 3 phút kể từ điểm GPS mới nhất. */
export function isFleetSignalStale(effectiveLastSignalIso: string | null, nowMs: number): boolean {
  if (!effectiveLastSignalIso) return true;
  const t = Date.parse(effectiveLastSignalIso);
  if (Number.isNaN(t)) return true;
  return nowMs - t > 180_000;
}
