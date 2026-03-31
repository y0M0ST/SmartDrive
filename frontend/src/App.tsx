import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import HomePage from "./pages/HomePage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={localStorage.getItem("access_token") ? "/home" : "/login"} replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/portal/driver" element={<Navigate to="/home" replace />} />

        <Route path="*" element={<div className="p-10 text-3xl text-red-500">404 - Trang không tồn tại</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;