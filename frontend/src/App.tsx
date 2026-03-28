import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

// Component tạm thời để test luồng chuyển trang (Redirect)
const AdminDashboard = () => <div className="p-10 text-3xl">Trang Admin Dashboard</div>;
const DriverPortal = () => <div className="p-10 text-3xl">Trang Cổng thông tin Tài xế</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định: Tự động chuyển đến trang Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Các trang Auth (Đăng nhập & Quên mật khẩu) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Các trang sau khi đăng nhập (Cần API thật để test luồng redirect chuẩn) */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/portal/driver" element={<DriverPortal />} />

        {/* Trang 404 (Nếu cần) */}
        <Route path="*" element={<div className="p-10 text-3xl text-red-500">404 - Trang không tồn tại</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;