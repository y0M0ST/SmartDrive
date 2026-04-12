import apiClient from './apiClient';

export const vehicleAPI = {
  /** Danh sách xe */
  getAll: () => apiClient.get('/vehicles'),

  /** Tạo xe */
  create: (data: any) => apiClient.post('/vehicles', data),

  /** Cập nhật xe theo id */
  update: (id: string, data: any) => apiClient.patch(`/vehicles/${id}`, data),

  /** Xóa xe theo id */
  delete: (id: string) => apiClient.delete(`/vehicles/${id}`),
};