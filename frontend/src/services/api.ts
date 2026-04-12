import axios, { AxiosHeaders } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" }
});

// 1. REQUEST INTERCEPTOR: "Tự động nhét Token"
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    /** FormData cần boundary tự sinh — không gửi application/json mặc định của instance */
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const h = config.headers;
      if (h instanceof AxiosHeaders) {
        h.delete("Content-Type");
      } else {
        delete (h as Record<string, unknown>)["Content-Type"];
      }
    }

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