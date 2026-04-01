import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes"; // Nhớ cài: npm install next-themes
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import RouteListPage from "./pages/routes/RouteListPage";
import AccountManagementPage from "./pages/accounts/AccountManagementPage";

// Các Component test
const AdminDashboard = () => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[400px] transition-colors">
    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Chào mừng đến với Dashboard</h2>
    <p className="text-slate-500 dark:text-slate-400 mt-2">Dữ liệu thống kê sẽ hiển thị tại đây.</p>
  </div>
);

const DriverPortal = () => <div className="p-10 text-3xl dark:text-white">Trang Cổng thông tin Tài xế</div>;

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <BrowserRouter>
        <Routes>
          {/* --- 1. ĐIỀU HƯỚNG MẶC ĐỊNH --- */}
          {/* Khi người dùng gõ địa chỉ web mà không có hậu tố, tự động đá sang Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* --- 2. CÁC TRANG AUTH --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* --- 3. CÁC TRANG ADMIN (BỌC TRONG MAINLAYOUT) --- */}
          <Route path="/admin/dashboard" element={<MainLayout><AdminDashboard /></MainLayout>} />
          <Route path="/admin/routes" element={<MainLayout><RouteListPage /></MainLayout>} />
          <Route path="/admin/accounts" element={<MainLayout><AccountManagementPage /></MainLayout>} />
          
          {/* --- 4. TRANG PORTAL RIÊNG --- */}
          <Route path="/portal/driver" element={<DriverPortal />} />

          {/* --- 5. TRANG 404 --- */}
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
              <div className="text-center">
                <h1 className="text-9xl font-black text-slate-200 dark:text-slate-800">404</h1>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 -mt-8 px-4">Trang không tồn tại</p>
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  QUAY LẠI ĐĂNG NHẬP
                </button>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;