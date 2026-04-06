import api from "./api";

export const profileApi = {
  // 1. Vì Backend chưa có API GET thông tin, mình tạm lấy từ LocalStorage 
  // (Nơi bạn đã lưu user_info khi Login thành công)
  getMeLocal: () => {
    const userInfo = localStorage.getItem("user_info");
    return userInfo ? JSON.parse(userInfo) : null;
  },

  // 2. API Đổi mật khẩu (KHỚP 100% SWAGGER)
  // Endpoint: PUT /api/auth/change-password
  changePassword: (data: { oldPassword: string; newPassword: string }) => 
    api.put("/auth/change-password", {
      old_password: data.oldPassword,    // Đúng tên gạch nối
      new_password: data.newPassword,    // Đúng tên gạch nối
      confirm_password: data.newPassword // Backend yêu cầu confirm_password
    }),
};