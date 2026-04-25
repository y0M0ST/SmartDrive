import api from "./api";
import type { ViolationListResponse } from "@/types/violation";

export type ViolationListParams = {
  page?: number;
  limit?: number;
  /** `YYYY-MM-DD` theo lịch VN — phải gửi cùng `endDate` hoặc bỏ cả hai. */
  startDate?: string;
  endDate?: string;
  driverId?: string;
  vehicleId?: string;
  type?: "DROWSY" | "DISTRACTED";
  isRead?: boolean;
};

function buildParams(p: ViolationListParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (p.page != null) out.page = p.page;
  if (p.limit != null) out.limit = p.limit;
  if (p.startDate) out.startDate = p.startDate;
  if (p.endDate) out.endDate = p.endDate;
  if (p.driverId) out.driverId = p.driverId;
  if (p.vehicleId) out.vehicleId = p.vehicleId;
  if (p.type) out.type = p.type;
  if (p.isRead !== undefined) out.isRead = p.isRead;
  return out;
}

/** Khớp `ServiceResponse` từ backend (`axios` response). */
export function unwrapViolationList(res: {
  data?: { data?: ViolationListResponse };
}): ViolationListResponse | null {
  const inner = res.data?.data;
  if (!inner || typeof inner !== "object") return null;
  if (Array.isArray(inner.data) && inner.meta && typeof inner.meta.total === "number") {
    return inner as ViolationListResponse;
  }
  return null;
}

export const violationApi = {
  getList: (params: ViolationListParams) =>
    api.get("/agencies/violations", { params: buildParams(params) }),
};
