import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import AuthLayout from "@/components/ui/layout/AuthLayout";
import api from "@/services/api";
import { canAccessAdminDashboard, getAdminHomePath } from "@/lib/adminAccess";

// 1. Chỉ validate email + password. Không gắn rememberMe vào RHF — Radix Checkbox + register()
//    gây giá trị sai → Zod fail im lặng (handleSubmit không gọi onSubmit, không có toast).
const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    /** Xóa phiên rồi ở lại trang đăng nhập (dev / đổi tài khoản test) */
    if (searchParams.get("logout") === "1") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_info");
      navigate("/login", { replace: true });
      return;
    }

    // Cho phép /login?relogin=1 — không tự redirect nếu đang cố đổi tài khoản
    if (searchParams.get("relogin") === "1") return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload?.exp && payload.exp > now) {
        let role: string | undefined = typeof payload.role === "string" ? payload.role : undefined;
        if (!role) {
          try {
            role = (JSON.parse(localStorage.getItem("user_info") || "{}") as { role?: string })
              ?.role;
          } catch {
            role = undefined;
          }
        }
        const dest = canAccessAdminDashboard(role)
          ? getAdminHomePath(role)
          : "/portal/driver";
        navigate(dest, { replace: true });
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_info");
      }
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_info");
    }
  }, [navigate, searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2. Setup Form
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onInvalid = () => {
    toast.error("Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.");
  };

  // 3. Xử lý Logic Đăng nhập
  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: data.email,
        password: data.password
      });

      const body = response.data as {
        status?: string;
        data?: {
          accessToken?: string;
          refreshToken?: string;
          user?: { role?: string; id?: string; email?: string };
        };
      };

      const authData = body?.data;
      if (
        body?.status === "success" &&
        authData?.accessToken &&
        authData.user
      ) {
        const { accessToken, refreshToken, user } = authData;
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken || "");
        localStorage.setItem("user_info", JSON.stringify(user));

        const role = user.role ?? "";
        const isAdmin = canAccessAdminDashboard(role);

        toast.success("Đăng nhập thành công!");
        if (isAdmin) {
          navigate(getAdminHomePath(role), { replace: true });
        } else {
          navigate("/portal/driver/schedule", { replace: true });
        }
      } else {
        toast.error("Phản hồi đăng nhập không hợp lệ từ server.");
      }
    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (!error.response) {
        toast.error("Không kết nối được máy chủ.", {
          description: "Kiểm tra kết nối mạng và thử lại sau ít phút.",
        });
      } else {
        const msg = String(errorData?.message || "");
        if (
          /vô hiệu hóa\.|liên hệ Admin/i.test(msg) ||
          /bị khóa|đã bị khóa|BLOCKED|inactive/i.test(msg) ||
          status === 403
        ) {
          toast.error("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin");
        } else if (
          status === 401 ||
          status === 404 ||
          /Email hoặc mật khẩu không chính xác|không chính xác/i.test(msg)
        ) {
          toast.error("Tên đăng nhập hoặc mật khẩu không chính xác.");
        } else {
          toast.error(msg || "Lỗi hệ thống, vui lòng thử lại sau!");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Đăng nhập">
      {/* Sửa form: Thêm autoComplete="off" và Glassmorphism UI */}
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        autoComplete="off"
        className="space-y-6 bg-white/30 backdrop-blur-md border border-white/40 shadow-2xl rounded-2xl p-8"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold text-foreground">
            Email đăng nhập
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Nhập địa chỉ email của bạn"
            autoComplete="email"
            {...register("email")}
            className={`bg-white/50 focus:bg-white/80 transition-all ${errors.email ? "border-red-500" : ""}`}
          />
          {errors.email && <p className="text-sm text-red-600 font-medium">{errors.email.message}</p>}
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="password" className="font-semibold text-foreground">Mật khẩu</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              // Chặn autofill triệt để cho password
              autoComplete="new-password"
              {...register("password")}
              className={`bg-white/50 focus:bg-white/80 transition-all ${errors.password ? "border-red-500 pr-10" : "pr-10"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-600 font-medium">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              className="border-gray-500"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
            />
            <Label htmlFor="rememberMe" className="cursor-pointer text-sm font-medium text-foreground">
              Ghi nhớ đăng nhập
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold shadow-lg transition-all"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</>
          ) : (
            "Đăng nhập"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}