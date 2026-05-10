/**
 * US_16 — Payload `GET /api/driver/me/violations` (hoặc `/api/driver/violations`; ServiceResponse: `data.data` + `data.meta`).
 * Khớp `DriverViolationListItem` từ `driver-portal.service.ts`.
 */
export type DriverViolationCoordinates = {
  latitude: number | null;
  longitude: number | null;
};

export type DriverViolationListItem = {
  id: string;
  type: string;
  occurred_at: string;
  image_url: string;
  trip_code: string;
  trip_id: string;
  coordinates: DriverViolationCoordinates;
};

export type DriverViolationsMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type DriverViolationsPayload = {
  data: DriverViolationListItem[];
  meta: DriverViolationsMeta;
};
