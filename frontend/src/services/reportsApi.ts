import api from "./api";
import type { AgencyDashboardPayload } from "@/types/agencyReports";

export type AgencyReportQueryParams = {
  startDate: string;
  endDate: string;
  driverId?: string;
};

function buildParams(p: AgencyReportQueryParams): Record<string, string> {
  const out: Record<string, string> = { startDate: p.startDate, endDate: p.endDate };
  if (p.driverId) out.driverId = p.driverId;
  return out;
}

/** Khớp `ServiceResponse` — payload nằm trong `response.data.data`. */
export function unwrapAgencyDashboard(res: {
  data?: { data?: AgencyDashboardPayload; status?: string };
}): AgencyDashboardPayload | null {
  const inner = res.data?.data;
  if (!inner || typeof inner !== "object") return null;
  if (!inner.summary || !inner.charts) return null;
  return inner as AgencyDashboardPayload;
}

export const reportsApi = {
  getDashboard: (p: AgencyReportQueryParams) =>
    api.get("/reports/dashboard", { params: buildParams(p) }),

  exportExcel: (p: AgencyReportQueryParams) =>
    api.get<Blob>("/reports/export-excel", {
      params: buildParams(p),
      responseType: "blob",
    }),
};
