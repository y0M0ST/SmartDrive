export type TripStatusCode = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface TripRouteEmbed {
  id: string;
  name: string;
  start_point: string;
  end_point: string;
  distance_km?: number;
  estimated_hours?: number;
}

export interface TripVehicleEmbed {
  id: string;
  license_plate: string;
  status: string;
  type?: string;
  capacity?: number;
  ai_camera_id?: string | null;
}

export interface TripDriverEmbed {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  username?: string;
}

/** Bản ghi vi phạm AI (khớp entity `ai_violations` từ BE). */
export interface AiViolationRow {
  id: string;
  trip_id: string;
  driver_id: string;
  vehicle_id: string;
  type: string;
  image_url: string;
  occurred_at: string;
  latitude?: number | null;
  longitude?: number | null;
  is_read?: boolean;
}

export interface TripRow {
  id: string;
  trip_code: string;
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  departure_time: string;
  planned_end_time: string;
  status: TripStatusCode;
  route?: TripRouteEmbed;
  vehicle?: TripVehicleEmbed;
  driver?: TripDriverEmbed;
}

/** Payload `GET /api/agencies/trips/:id` (ServiceResponse.data). */
export interface TripDetail extends TripRow {
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  cancel_reason?: string | null;
  agency_id?: string;
  ai_violations?: AiViolationRow[];
}
