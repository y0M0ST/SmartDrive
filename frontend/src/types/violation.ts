export type ViolationTypeCode = "DROWSY" | "DISTRACTED";

export type AgencyViolationRouteDto = {
  code: string | null;
  name: string | null;
  start_point: string | null;
  end_point: string | null;
} | null;

export type AgencyViolationTripDto = {
  id: string | null;
  trip_code: string | null;
  route: AgencyViolationRouteDto;
  vehicle: { id: string | null; license_plate: string | null } | null;
  driver: { id: string | null; full_name: string | null } | null;
};

export type AgencyViolationListItem = {
  id: string;
  trip_id: string;
  type: ViolationTypeCode | string;
  image_url: string;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string;
  is_read: boolean;
  trip: AgencyViolationTripDto;
};

export type ViolationListMeta = {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  range?: { from: string; to: string };
};

export type ViolationListResponse = {
  data: AgencyViolationListItem[];
  meta: ViolationListMeta;
};
