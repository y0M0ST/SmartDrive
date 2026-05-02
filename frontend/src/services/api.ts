import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { clearClientAuth, SESSION_EXPIRED_MESSAGE } from "@/lib/performLogout";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" }
});

const AUTH_401_MESSAGE_RE =
  /(token|phi[eê]n|session|h[eế]t h[aạ]n|kh[oô]ng h[oợ]p l[eệ]|cung c[aấ]p token|đăng nhập)/i;
const AUTH_401_ERROR_CODES = new Set([
  "AUTH_TOKEN_MISSING",
  "AUTH_SESSION_INVALID",
  "AUTH_SESSION_EXPIRED_OR_REVOKED",
  "AUTH_TOKEN_INVALID_OR_EXPIRED",
  "AUTH_TOKEN_EXPIRED",
  "AUTH_TOKEN_INVALID",
]);

// 1. REQUEST INTERCEPTOR: "Tự động nhét Token"
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token")?.trim();

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
      const h = AxiosHeaders.from(config.headers ?? {});
      h.set("Authorization", `Bearer ${token}`);
      config.headers = h;
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
    const status = error.response?.status;
    const message = String(error.response?.data?.message ?? "");
    const errorCode = String(error.response?.data?.errorCode ?? "");
    const requestUrl = String(error.config?.url ?? "");
    const hasBearerHeader = Boolean(error.config?.headers?.Authorization);
    const isAuthEndpoint = /\/auth\/(login|forgot-password|reset-password)/i.test(requestUrl);

    // Chỉ auto-logout khi 401 thật sự do phiên/token auth.
    // Không đánh đồng mọi 401 nghiệp vụ khác để tránh văng login sai ngữ cảnh.
    const shouldForceLogout =
      status === 401 &&
      !isAuthEndpoint &&
      hasBearerHeader &&
      (AUTH_401_ERROR_CODES.has(errorCode) || AUTH_401_MESSAGE_RE.test(message));

    if (shouldForceLogout) {
      const path = window.location.pathname;
      const onAuthForm =
        path.includes("/login") || path.includes("/forgot-password") || path.includes("/reset-password");
      if (!onAuthForm) {
        toast.error(SESSION_EXPIRED_MESSAGE, { duration: 3000 });
        clearClientAuth();
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;