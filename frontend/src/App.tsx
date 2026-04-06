import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import RouteListPage from "./pages/routes/RouteListPage";
// import AccountManagementPage from "./pages/accounts/AccountManagementPage";
import { Toaster, toast } from "sonner"; // Nhớ import thêm toast
import AdminProfilePage from "./pages/profiles/AdminProfilePage";
import { useEffect } from "react";
import DriverProfilePage from "./pages/drivers/DriverProfilePage";
// --- 1. COMPONENT BẢO VỆ ROUTE (FIX LỖI BACK) ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      // replace: true để đè trang Login lên Dashboard trong lịch sử duyệt web
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  if (!token) return null;
  return <>{children}</>;
};

// --- 2. COMPONENT ĐỒNG BỘ ĐA TAB (FIX LỖI MULTI-TAB) ---
const AuthSynchronizer = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  // Trong App.tsx
useEffect(() => {
  const handleSyncLogout = (event: StorageEvent) => {
    // Nếu tab khác xóa access_token, tab này cũng phải bay màu ngay
    if (event.key === "access_token" && !event.newValue) {
      window.location.href = "/login"; 
    }
  };

  window.addEventListener("storage", handleSyncLogout);
  return () => window.removeEventListener("storage", handleSyncLogout);
}, []);

  return <>{children}</>;
};

// Các Component test
const AdminDashboard = () => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[400px]">
    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Chào mừng đến với Dashboard</h2>
    <p className="text-slate-500 dark:text-slate-400 mt-2">Dữ liệu thống kê sẽ hiển thị tại đây.</p>
  </div>
);

const DriverPortal = () => <div className="p-10 text-3xl dark:text-white">Trang Cổng thông tin Tài xế</div>;

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Toaster position="top-right" richColors duration={2000} closeButton /> 
      <BrowserRouter>
        {/* Bọc toàn bộ Routes trong AuthSynchronizer để theo dõi biến động token */}
        <AuthSynchronizer>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            {/* --- CÁC TRANG ADMIN: ĐÃ ĐƯỢC BẢO VỆ --- */}
            <Route 
              path="/admin/dashboard" 
              element={<ProtectedRoute><MainLayout><AdminDashboard /></MainLayout></ProtectedRoute>} 
            />
            <Route 
              path="/admin/routes" 
              element={<ProtectedRoute><MainLayout><RouteListPage /></MainLayout></ProtectedRoute>} 
            />
            {/* <Route 
            
              path="/admin/accounts" 
              element={<ProtectedRoute><MainLayout><AccountManagementPage /></MainLayout></ProtectedRoute>} 
            /> */}
            <Route 
              path="/admin/profile" 
              element={<ProtectedRoute><MainLayout><AdminProfilePage /></MainLayout></ProtectedRoute>} 
            />
            
            <Route 
              path="/portal/driver" 
              element={<ProtectedRoute><DriverPortal /></ProtectedRoute>} 
            />
            <Route path="/admin/drivers" 
           element={<ProtectedRoute><MainLayout><DriverProfilePage /></MainLayout></ProtectedRoute>} 

            />


          </Routes>
        </AuthSynchronizer>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;