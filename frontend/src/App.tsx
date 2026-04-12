import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "sonner";
import {
  canAccessAdminDashboard,
  readStoredUserRole,
  getAdminHomePath,
} from "./lib/adminAccess";

import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import RouteListPage from "./pages/routes/RouteListPage";
import AdminProfilePage from "./pages/profiles/AdminProfilePage";
import DriverManagement from "./pages/DriverManagement";
import VehicleManagement from "./pages/VehicleManagement";
import AgencyDashboardPage from "./pages/agency/AgencyDashboardPage";
import AgencyPlaceholderPage from "./pages/agency/AgencyPlaceholderPage";
import SuperAdminOverviewPage from "./pages/super-admin/SuperAdminOverviewPage";
import SuperAdminAgenciesPage from "./pages/super-admin/SuperAdminAgenciesPage";
import SuperAdminPlansPage from "./pages/super-admin/SuperAdminPlansPage";
import SuperAdminLogsPage from "./pages/super-admin/SuperAdminLogsPage";

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

const AdminOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const role = readStoredUserRole();
    if (!canAccessAdminDashboard(role)) {
      navigate("/portal/driver", { replace: true });
    }
  }, [navigate]);

  const token = localStorage.getItem("access_token");
  const role = readStoredUserRole();
  if (!token || !canAccessAdminDashboard(role)) return null;
  return <>{children}</>;
};

/** Chỉ SUPER_ADMIN — khu /admin/super/*. */
function SuperAdminShell() {
  const role = readStoredUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== "SUPER_ADMIN") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [role, navigate]);

  if (role !== "SUPER_ADMIN") return null;
  return <Outlet />;
}

/** Chỉ AGENCY_ADMIN — dashboard nhà xe & vận hành (SA bị chuyển về super/overview). */
function AgencyShell() {
  const role = readStoredUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "SUPER_ADMIN") {
      navigate("/admin/super/overview", { replace: true });
    }
  }, [role, navigate]);

  if (role === "SUPER_ADMIN") return null;
  return <Outlet />;
}

function AdminHomeRedirect() {
  return <Navigate to={getAdminHomePath(readStoredUserRole())} replace />;
}

function AppRootRedirect() {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={getAdminHomePath(readStoredUserRole())} replace />;
}

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

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="smartdrive-theme"
    >
      <Toaster position="top-right" richColors duration={10000} closeButton />
      <BrowserRouter>
        <AuthSynchronizer>
          <Routes>
            <Route path="/" element={<AppRootRedirect />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminOnlyRoute>
                    <MainLayout />
                  </AdminOnlyRoute>
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminHomeRedirect />} />
              <Route path="profile" element={<AdminProfilePage />} />

              <Route path="super" element={<SuperAdminShell />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<SuperAdminOverviewPage />} />
                <Route path="agencies" element={<SuperAdminAgenciesPage />} />
                <Route path="plans" element={<SuperAdminPlansPage />} />
                <Route path="logs" element={<SuperAdminLogsPage />} />
              </Route>

              <Route element={<AgencyShell />}>
                <Route path="dashboard" element={<AgencyDashboardPage />} />
                <Route path="routes" element={<RouteListPage />} />
                <Route path="drivers" element={<DriverManagement />} />
                <Route path="vehicles" element={<VehicleManagement />} />
                <Route path="accounts" element={<Navigate to="/admin/drivers" replace />} />
                <Route
                  path="trips"
                  element={<AgencyPlaceholderPage title="Quản lí chuyến đi" />}
                />
                <Route
                  path="violations"
                  element={<AgencyPlaceholderPage title="Lịch sử vi phạm" />}
                />
                <Route
                  path="ratings"
                  element={<AgencyPlaceholderPage title="Đánh giá và xếp hạng" />}
                />
                <Route
                  path="finance"
                  element={<AgencyPlaceholderPage title="Thống kê thu nhập & báo cáo" />}
                />
              </Route>
            </Route>

            <Route
              path="/portal/driver"
              element={
                <ProtectedRoute>
                  <div className="p-10 text-3xl dark:text-white">Cổng thông tin tài xế (Driver Portal)</div>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthSynchronizer>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
