import apiClient from './apiClient';

export const vehicleAPI = {
  // Lấy danh sách xe (GET /vehicles)
  getAll: () => apiClient.get('/vehicles'),
  
  // Thêm xe mới (POST /vehicles)
  create: (data: any) => apiClient.post('/vehicles', data),
  
  // Cập nhật xe (PATCH /vehicles/:id)
  update: (id: string, data: any) => apiClient.patch(`/vehicles/${id}`, data),
  
  // Xóa xe (DELETE /vehicles/:id)
  delete: (id: string) => apiClient.delete(`/vehicles/${id}`),
};