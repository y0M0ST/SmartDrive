import api from "./api";

export const driverApi = {
  // --- QUẢN LÝ HỒ SƠ TÀI XẾ (BẢNG DRIVERS) ---
  // Lấy danh sách hồ sơ: GET /api/drivers
  getProfiles: (params?: any) => api.get("/drivers", { params }),
  
  // Tạo hồ sơ mới: POST /api/drivers
  createProfile: (data: any) => api.post("/drivers", data),
  
  // Cập nhật hồ sơ: PUT /api/drivers/{id}
  updateProfile: (id: string, data: any) => api.put(`/drivers/${id}`, data),
  
  // Xóa hồ sơ: DELETE /api/drivers/{id}
  deleteProfile: (id: string) => api.delete(`/drivers/${id}`),

  // --- QUẢN LÝ TÀI KHOẢN ĐĂNG NHẬP (BẢNG DRIVER_ACCOUNTS) ---
  // Lấy danh sách tài khoản: GET /api/driver-accounts
  getAccounts: (params?: any) => api.get("/driver-accounts", { params }),
  
  // Cấp tài khoản cho tài xế đã có hồ sơ: POST /api/driver-accounts
  createAccount: (data: any) => api.post("/driver-accounts", data),
  
  // Đổi trạng thái/Email tài khoản: PUT /api/driver-accounts/{id}
  updateAccount: (id: string, data: any) => api.put(`/driver-accounts/${id}`, data),
  
  // Xóa tài khoản: DELETE /api/driver-accounts/{id}
  deleteAccount: (id: string) => api.delete(`/driver-accounts/${id}`),
};