import api from "./api";
import type { DriverMyTripsPayload } from "@/types/driverPortal";

export type MyTripsParams = {
  page?: number;
  limit?: number;
};

/** Khớp `ServiceResponse` — payload `{ data, meta }` nằm trong `response.data.data`. */
export function unwrapDriverMyTrips(res: { data?: { data?: DriverMyTripsPayload } }): DriverMyTripsPayload | null {
  const inner = res.data?.data;
  if (!inner || typeof inner !== "object") return null;
  if (Array.isArray(inner.data) && inner.meta && typeof inner.meta.total === "number") {
    return inner as DriverMyTripsPayload;
  }
  return null;
}

export type DriverFaceTemplatePayload = {
  faceEncoding: number[];
  /** BE: `DriverProfile.is_locked` — điểm danh Face ID bị khóa (US_18). */
  is_locked?: boolean;
};

/** `ServiceResponse.data` — mẫu khuôn mặt từ GET `/driver/me/face-template`. */
export function unwrapFaceTemplate(res: { data?: { data?: DriverFaceTemplatePayload } }): DriverFaceTemplatePayload | null {
  const inner = res.data?.data;
  if (!inner || !Array.isArray(inner.faceEncoding)) return null;
  return inner as DriverFaceTemplatePayload;
}

export const driverApi = {
  getUsers: (params?: Record<string, unknown>) => api.get("/users", { params }),
  createUser: (data: unknown) => api.post("/users", data),
  updateUser: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getProfile: (userId: string) => api.get(`/users/${userId}/driver-profile`),
  /** FormData: để trình duyệt tự gắn boundary multipart */
  createProfile: (data: FormData) => api.post("/users/driver-profile", data),
  updateProfile: (userId: string, data: FormData) =>
    api.put(`/users/${userId}/driver-profile`, data),

  /** US_15 — JWT DRIVER, không gửi driverId. */
  getMyTrips: (params?: MyTripsParams) => api.get("/driver/me/trips", { params }),

  /** US_18 — lấy mẫu vector (404 nếu chưa đăng ký). */
  getFaceTemplate: () => api.get("/driver/me/face-template"),
  saveFaceTemplate: (faceEncoding: number[]) => api.post("/driver/me/face-template", { faceEncoding }),
  checkinTrip: (tripId: string, body: { result: "SUCCESS" | "FAILED" | "LOCKED"; matchScore: number }) =>
    api.post(`/driver/me/trips/${tripId}/checkin`, body),
};
