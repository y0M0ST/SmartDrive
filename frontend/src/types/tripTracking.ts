/** Khớp `ActiveTripTrackingRow` backend (`trip-tracking.service.ts`). */
export type ActiveTripTrackingRow = {
  trip_id: string;
  trip_code: string;
  license_plate: string;
  driver_name: string;
  violation_count: number;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  last_signal_time: string | null;
};

/** Khớp `TripGpsSocketPayload` backend (`socket-hub.ts`) — sự kiện `trip_gps_update`. */
export type TripGpsSocketPayload = {
  trip_id: string;
  agency_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number | null;
  recorded_at: string;
};

export function isTripGpsSocketPayload(raw: unknown): raw is TripGpsSocketPayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.trip_id === "string" &&
    typeof o.agency_id === "string" &&
    typeof o.latitude === "number" &&
    typeof o.longitude === "number" &&
    typeof o.speed === "number" &&
    (o.heading === null || typeof o.heading === "number") &&
    typeof o.recorded_at === "string"
  );
}
