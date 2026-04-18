import api from "./api";

export type TripListParams = {
  page?: number;
  limit?: number;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
};

export type CreateTripBody = {
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  /** ISO 8601 */
  departure_time: string;
};

export type AvailableSlotParams = {
  departure_time: string;
  planned_end_time: string;
};

export const tripApi = {
  getList: (params?: TripListParams) => api.get("/agencies/trips", { params }),
  getDetail: (id: string) => api.get(`/agencies/trips/${id}`),
  getAvailableDrivers: (params: AvailableSlotParams) =>
    api.get("/agencies/trips/available-drivers", { params }),
  getAvailableVehicles: (params: AvailableSlotParams) =>
    api.get("/agencies/trips/available-vehicles", { params }),
  create: (body: CreateTripBody) => api.post("/agencies/trips", body),
};
