import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "sonner";

// Layouts & Components
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import RouteListPage from "./pages/routes/RouteListPage";
import AdminProfilePage from "./pages/profiles/AdminProfilePage";
import DriverProfilePage from "./pages/drivers/DriverProfilePage";

// Import các trang từ nhánh HEAD
import DriverManagement from './pages/DriverManagement';
import VehicleManagement from './pages/VehicleManagement';

// --- 1. COMPONENT BẢO VỆ ROUTE ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  if (!token) return null;
  return <>{children}</>;
};

// --- 2. COMPONENT ĐỒNG BỘ ĐA TAB ---
const AuthSynchronizer = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleSyncLogout = (event: StorageEvent) => {
      if (event.key === "access_token" && !event.newValue) {
        window.location.href = "/login";
      }
    };
    window.addEventListener("storage", handleSyncLogout);
    return () => window.removeEventListener("storage", handleSyncLogout);
  }, []);

  return <>{children}</>;
};

// Component Dashboard tạm thời
const AdminDashboard = () => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[400px]">
    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Chào mừng đến với Dashboard</h2>
    <p className="text-slate-500 dark:text-slate-400 mt-2">Dữ liệu thống kê sẽ hiển thị tại đây.</p>
  </div>
);

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Toaster position="top-right" richColors duration={2000} closeButton />
      <BrowserRouter>
        <AuthSynchronizer>
          <Routes>
            {/* Redirect mặc định */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Admin Routes (Đã bọc ProtectedRoute và MainLayout) */}
            <Route path="/admin" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="routes" element={<RouteListPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
              {/*<Route path="drivers" element={<DriverProfilePage />} />*/}
              
              {/* Đưa các trang từ HEAD vào đây để có Sidebar/Header của MainLayout */}
              <Route path="drivers" element={<DriverManagement />} />
              <Route path="vehicles" element={<VehicleManagement />} />
            </Route>

            {/* Driver Portal */}
            <Route 
              path="/portal/driver" 
              element={<ProtectedRoute><div className="p-10 text-3xl dark:text-white">Trang Tài xế</div></ProtectedRoute>} 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthSynchronizer>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;