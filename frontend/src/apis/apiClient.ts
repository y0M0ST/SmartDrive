import axios from 'axios';

const apiClient = axios.create({
  // Ưu tiên lấy từ file .env, nếu không có thì mặc định Port 5000
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Tạm thời tắt để Test không cần Login
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Sửa lại mã lỗi 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sửa từ 101 thành 401 cho đúng chuẩn Backend
    if (error.response && error.response.status === 401) { 
      console.error("Phiên đăng nhập hết hạn hoặc chưa đăng nhập!");
      // Nếu Rin đang test UI 5-6 mà không muốn bị đá ra trang Login, 
      // hãy tạm comment dòng window.location dưới đây lại nhé.
      // localStorage.removeItem('token');
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default apiClient;