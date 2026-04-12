import api from "./api";

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
};
