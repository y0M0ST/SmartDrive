import api from "./api";

export type AgencyStatus = "ACTIVE" | "INACTIVE";

export interface Agency {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  status: AgencyStatus;
  created_at?: string;
  updated_at?: string;
}

export const agenciesApi = {
  getList: (params?: { page?: number; limit?: number; search?: string; status?: AgencyStatus }) =>
    api.get("/agencies", { params }),

  create: (body: { code: string; name: string; address?: string; phone?: string }) =>
    api.post("/agencies", body),

  update: (id: string, body: { name?: string; address?: string; phone?: string }) =>
    api.put(`/agencies/${id}`, body),

  changeStatus: (id: string, status: AgencyStatus) =>
    api.patch(`/agencies/${id}/status`, { status }),
};
