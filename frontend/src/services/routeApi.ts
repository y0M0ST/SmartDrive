import api from "./api";

export const routeApi = {
  getList: (params?: any) => api.get("/routes", { params }),
  getDetail: (id: string) => api.get(`/routes/${id}`),
  create: (data: any) => api.post("/routes", data),
  update: (id: string, data: any) => api.put(`/routes/${id}`, data),
  changeStatus: (id: string, body: { status: "ACTIVE" | "SUSPENDED" }) =>
    api.patch(`/routes/${id}/status`, body),
  delete: (id: string) => api.delete(`/routes/${id}`),
};