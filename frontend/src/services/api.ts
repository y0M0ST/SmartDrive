import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

// 1. REQUEST INTERCEPTOR: "Bắt tự động nhét Token"
api.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage (thường lưu dưới tên 'access_token')
    const token = localStorage.getItem("access_token");
    
    if (token) {
      // Nhét token vào Header theo chuẩn Bearer
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. RESPONSE INTERCEPTOR: "Đá văng ra trang Login nếu hết hạn"
api.interceptors.response.use(
  (response) => response, // Nếu gọi API thành công thì trả về kết quả luôn
  (error) => {
    // Kiểm tra nếu lỗi trả về là 401 (Unauthorized - Token hết hạn hoặc sai)
    if (error.response && error.response.status === 401) {
      console.error("Token hết hạn. Đang chuyển hướng về trang Login...");
      
      // Xóa token cũ đã hết hạn
      localStorage.removeItem("access_token");
      
      // Đá văng ra trang Login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;