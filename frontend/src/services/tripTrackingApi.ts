import api from "./api";
import type { ActiveTripTrackingRow } from "@/types/tripTracking";

export function unwrapActiveTracking(res: {
  data?: { data?: { trips?: ActiveTripTrackingRow[] } };
}): ActiveTripTrackingRow[] {
  const trips = res.data?.data?.trips;
  return Array.isArray(trips) ? trips : [];
}

export const tripTrackingApi = {
  getActiveTracking: () => api.get("/trips/active-tracking"),
};
