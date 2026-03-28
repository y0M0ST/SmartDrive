import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react"; // Thư viện icon

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
  email: z.string().email({ message: "Email không hợp lệ" }),
  password: z.string().min(1, { message: "Vui lòng nhập mật khẩu" }),
  rememberMe: z.boolean().optional(), // Dùng .optional() để tránh lỗi Type
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false); // Trạng thái ẩn/hiện mật khẩu
  const [loading, setLoading] = useState(false); // Trạng thái đang đăng nhập

  // 2. Setup Form
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // 3. Xử lý Logic Đăng nhập (US_01 Happy & Unhappy Path)
  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      // Gọi API đăng nhập (Thay URL /auth/login bằng API thật của nhóm)
      const res = await api.post("/auth/login", {
        email: data.email,
        password: data.password
      });
      
      const { token, role, status } = res.data;

      // Kiểm tra luồng ngoại lệ: Tài khoản bị khóa
      if (status === "disabled") {
        alert("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin");
        return;
      }

      // Luồng thành công: Lưu Token
      localStorage.setItem("access_token", token);
      console.log("Đăng nhập thành công!", res.data);

      // Tự động phân luồng (Redirect) dựa vào role
      if (role === "admin" || role === "coordinator") {
        navigate("/admin/dashboard"); // Chuyển sang Web Admin
      } else if (role === "driver") {
        navigate("/portal/driver"); // Chuyển sang Cổng thông tin tài xế
      } else {
        alert("Vai trò tài khoản không hợp lệ.");
      }

    } catch (error: any) {
      // Xử lý luồng ngoại lệ: Nhập sai tài khoản/mật khẩu
      if (error.response && error.response.status === 401) {
        alert("Tên đăng nhập hoặc mật khẩu không chính xác");
      } else {
        alert("Đã có lỗi xảy ra, vui lòng thử lại sau.");
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
            placeholder="example@gmail.com" 
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
            <Checkbox id="rememberMe" {...register("rememberMe")} />
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