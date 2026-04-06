import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react"; // Thư viện icon
import { toast } from "sonner";
// Thêm chữ "ui" vào giữa components và tên component
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Lưu ý: AuthLayout của Minh nằm trong ui/layout
import AuthLayout from "@/components/ui/layout/AuthLayout";

// Đảm bảo file trong folder services tên là api.ts
import api from "@/services/api";

// 1. Định nghĩa luật Validation (Lỗi đỏ)
const loginSchema = z.object({
  email: z.string().min(1, "E-mail không được bỏ trống").email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được bỏ trống"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();

  // Dán cái này vào trong function LoginPage()
  useEffect(() => {
  // --- THÊM LOGIC NÀY ---
  const token = localStorage.getItem("access_token");
  if (token) {
    navigate("/admin/dashboard", { replace: true });
    return;
  }
  // ----------------------

  // Logic chặn nút Back hiện tại của Minh giữ nguyên
  window.history.pushState(null, "", window.location.href);
  window.onpopstate = function () {
    window.history.go(1);
  };

  return () => {
    window.onpopstate = null;
  };
}, [navigate]);
  const [showPassword, setShowPassword] = useState(false); // Trạng thái ẩn/hiện mật khẩu
  const [loading, setLoading] = useState(false); // Trạng thái đang đăng nhập

  // 2. Setup Form
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange", // <--- THÊM DÒNG NÀY: Gõ đến đâu báo lỗi đến đó
  });


  // 3. Xử lý Logic Đăng nhập (US_01 Happy & Unhappy Path)
  const onSubmit = async (data: LoginFormValues) => {
  setLoading(true);
  try {
    const response = await api.post("/auth/login", {
      email: data.email,
      password: data.password
    });

    const { success, message, data: authData } = response.data;

    // Trong hàm onSubmit, phần điều hướng
if (success) {
  toast.success("Đăng nhập thành công!");
  localStorage.setItem("access_token", authData.token);
  localStorage.setItem("user_info", JSON.stringify(authData.admin));

  const role = authData.admin.role;
  setTimeout(() => {
    // Sửa lại các role được phép vào trang admin
    if (role === "super_admin" || role === "agency_manager") {
      navigate("/admin/dashboard");
    } else {
      navigate("/portal/driver");
    }
  }, 1000);
}
  } catch (error: any) {
  const status = error.response?.status;
  const errorData = error.response?.data;

  // Trường hợp 401 (Sai pass) hoặc 404 (Không thấy email)
  if (status === 401 || status === 404) {
    toast.error("Tài khoản hoặc mật khẩu không chính xác!");
  } 
  
  // Trường hợp 403 (Tài khoản bị khóa - cái này nên báo riêng để user biết)
  else if (status === 403) {
    toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!");
  }

  // Các lỗi khác (Server die, mất mạng...)
  else {
    toast.error(errorData?.message || "Lỗi hệ thống, vui lòng thử lại sau!");
  }
} finally {
  setLoading(false);
}
};
  return (
    <AuthLayout title="Đăng nhập">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Trường nhập Email */}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="" 
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        {/* Trường nhập Mật khẩu (Có nút Mắt) */}
        <div className="space-y-2 relative">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} // Switch type
              placeholder="••••••••"
              {...register("password")}
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
            />
            {/* Nút biểu tượng Mắt để ẩn/hiện */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        {/* Remember me & Quên mật khẩu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input type="checkbox" {...register("rememberMe")} />
            <Label htmlFor="rememberMe" className="text-sm font-normal">Remember me</Label>
          </div>
          <Link 
            to="/forgot-password" 
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Nút Đăng nhập */}
        <Button type="submit" className="w-full bg-gray-900 text-white" disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait</>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}