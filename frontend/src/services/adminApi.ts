import api from "./api";

export const adminApi = {
  getList: (params?: any) => api.get("/users", { params }),
  getRoles: () => api.get("/roles"),
  getDetail: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post("/users", data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  changeStatus: (id: string, status: "ACTIVE" | "INACTIVE" | "BLOCKED") =>
    api.patch(`/users/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/users/${id}`),
};