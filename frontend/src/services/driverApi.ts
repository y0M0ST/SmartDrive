import api from "./api";
import type { DriverMyTripsPayload } from "@/types/driverPortal";
import type { DriverViolationsPayload } from "@/types/driverViolations";
import type { DriverStatisticsPayload } from "@/types/driverStatistics";

export type MyTripsParams = {
  page?: number;
  limit?: number;
};

export type MyViolationsParams = {
  month: string;
  tripCode?: string;
  page?: number;
  limit?: number;
};

export type DriverStatisticsParams = {
  /** `YYYY-MM` theo lịch VN; bỏ qua = BE dùng tháng hiện tại. */
  month?: string;
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

/** US_16 — `{ data, meta }` nằm trong `response.data.data`. */
export function unwrapDriverViolations(res: {
  data?: { data?: DriverViolationsPayload };
}): DriverViolationsPayload | null {
  const inner = res.data?.data;
  if (!inner || !Array.isArray(inner.data) || !inner.meta || typeof inner.meta.total !== "number") {
    return null;
  }
  return inner as DriverViolationsPayload;
}

/** US_17 — `{ cards, charts }` trong `response.data.data`. */
export function unwrapDriverStatistics(res: {
  data?: { data?: DriverStatisticsPayload };
}): DriverStatisticsPayload | null {
  const inner = res.data?.data;
  if (!inner?.cards || !inner.charts) return null;
  if (typeof inner.cards.evaluation_month !== "string") return null;
  if (!Array.isArray(inner.charts.safety_score_by_week) || !Array.isArray(inner.charts.estimated_income_by_week)) {
    return null;
  }
  return inner as DriverStatisticsPayload;
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

  /** US_17 — Thống kê (`month` tuỳ chọn). BE: `/driver/me/statistics` hoặc `/driver/statistics`. */
  getStatistics: (params?: DriverStatisticsParams) =>
    api.get("/driver/me/statistics", {
      params: params?.month?.trim() ? { month: params.month.trim() } : {},
    }),

  /** US_16 — Lịch sử vi phạm (bắt buộc `month=YYYY-MM`). BE: `/driver/me/violations` hoặc `/driver/violations`. */
  getMyViolations: (params: MyViolationsParams) =>
    api.get("/driver/me/violations", {
      params: {
        month: params.month,
        ...(params.tripCode?.trim() ? { tripCode: params.tripCode.trim() } : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 15,
      },
    }),

  /** US_18 — lấy mẫu vector (404 nếu chưa đăng ký). */
  getFaceTemplate: () => api.get("/driver/me/face-template"),
  saveFaceTemplate: (faceEncoding: number[]) => api.post("/driver/me/face-template", { faceEncoding }),
  checkinTrip: (tripId: string, body: { result: "SUCCESS" | "FAILED" | "LOCKED"; matchScore: number }) =>
    api.post(`/driver/me/trips/${tripId}/checkin`, body),
};
