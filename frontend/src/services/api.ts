import axios from "axios";

const api = axios.create({
  // 1. Đổi 8000 thành 5000 (Cổng BE của bạn)
  // 2. Swagger của bạn khai báo các path đã có sẵn "/api", 
  // nên baseURL chỉ cần dừng ở domain gốc để tránh bị lặp thành "/api/api/auth/login"
baseURL: import.meta.env.VITE_API_URL,
});

// 1. REQUEST INTERCEPTOR: "Tự động nhét Token"
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    
    if (token) {
      // Giữ nguyên chuẩn Bearer vì Swagger của bạn yêu cầu SecurityScheme là bearerAuth
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. RESPONSE INTERCEPTOR: "Xử lý lỗi tập trung"
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    // Kiểm tra lỗi 401 (Hết hạn hoặc sai token)
    if (error.response && error.response.status === 401) {
      // Chỉ redirect nếu không phải đang ở trang login (tránh vòng lặp vô tận)
      if (!window.location.pathname.includes("/login")) {
        console.error("Phiên đăng nhập hết hạn.");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_info"); // Xóa thêm thông tin user nếu có lưu
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;