import type { TripGpsSocketPayload } from "@/types/tripTracking";

type LiveEntry = TripGpsSocketPayload & { _receivedAtMs: number };

let snapshot: Record<string, LiveEntry> = {};
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Đăng ký theo mô hình `useSyncExternalStore` — chỉ component đăng ký re-render khi GPS đổi. */
export function subscribeTripGps(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTripGpsSnapshot(): Record<string, LiveEntry> {
  return snapshot;
}

export function ingestTripGpsUpdate(p: TripGpsSocketPayload): void {
  snapshot = { ...snapshot, [p.trip_id]: { ...p, _receivedAtMs: Date.now() } };
  emit();
}

/** Xóa bản ghi GPS realtime cho các chuyến không còn IN_PROGRESS (tránh rò bộ nhớ / marker ma). */
export function pruneTripGpsStore(keepTripIds: Set<string>): void {
  const next: Record<string, LiveEntry> = {};
  for (const id of keepTripIds) {
    const row = snapshot[id];
    if (row) next[id] = row;
  }
  const before = Object.keys(snapshot).sort().join(",");
  const after = Object.keys(next).sort().join(",");
  if (before !== after) {
    snapshot = next;
    emit();
  }
}
