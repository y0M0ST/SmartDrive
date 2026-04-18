import type { TripStatusCode } from "@/types/trip";

export type DriverPortalAgencyDto = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  status: string;
};

export type DriverPortalRouteDto = {
  id: string;
  code: string;
  name: string;
  start_point: string;
  end_point: string;
  distance_km: number;
  estimated_hours: number;
  status: string;
};

export type DriverPortalVehicleDto = {
  id: string;
  license_plate: string;
  type: string;
  status: string;
};

export type DriverPortalTrip = {
  id: string;
  trip_code: string;
  status: TripStatusCode;
  departure_time: string;
  planned_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  cancel_reason: string | null;
  route: DriverPortalRouteDto;
  vehicle: DriverPortalVehicleDto;
  agency: DriverPortalAgencyDto;
};

export type DriverMyTripsMeta = {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
};

export type DriverMyTripsPayload = {
  data: DriverPortalTrip[];
  meta: DriverMyTripsMeta;
};
