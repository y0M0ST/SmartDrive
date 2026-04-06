import api from "./api";

export const adminApi = {
  getList: (params?: any) => api.get("/admins", { params }),
  getDetail: (id: string) => api.get(`/admins/${id}`),
  create: (data: any) => api.post("/admins", data),
  update: (id: string, data: any) => api.put(`/admins/${id}`, data),
  delete: (id: string) => api.delete(`/admins/${id}`),
};