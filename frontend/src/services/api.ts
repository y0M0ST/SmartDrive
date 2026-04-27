import axios, { AxiosHeaders } from "axios";
import { toast } from "sonner";
import { clearClientAuth, SESSION_EXPIRED_MESSAGE } from "@/lib/performLogout";

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
      const path = window.location.pathname;
      const onAuthForm =
        path.includes("/login") || path.includes("/forgot-password") || path.includes("/reset-password");
      if (!onAuthForm) {
        toast.error(SESSION_EXPIRED_MESSAGE, { duration: 10_000 });
        clearClientAuth();
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;