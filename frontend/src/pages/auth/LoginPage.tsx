import { useState } from "react";
import * as z from "zod";
import { Link } from "react-router-dom";
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

const adminStorageKey = "smartdrive_admin";

// 1. Định nghĩa luật Validation (Lỗi đỏ)
const loginSchema = z.object({
  email: z.string().email({ message: "Email không hợp lệ" }),
  password: z.string().min(1, { message: "Vui lòng nhập mật khẩu" }),
  rememberMe: z.boolean().optional(), // Dùng .optional() để tránh lỗi Type
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false); // Trạng thái ẩn/hiện mật khẩu
  const [loading, setLoading] = useState(false); // Trạng thái đang đăng nhập
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [formData, setFormData] = useState({
    email: "admin@smartdrive.vn",
    password: "Admin@123",
    rememberMe: true,
  });

  // 3. Xử lý Logic Đăng nhập (US_01 Happy & Unhappy Path)
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setServerError("");

    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      const nextFieldErrors: Partial<Record<keyof LoginFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LoginFormValues | undefined;
        if (field && !nextFieldErrors[field]) {
          nextFieldErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      setLoading(false);
      return;
    }

    setFieldErrors({});

    try {
      const res = await api.post("/auth/login", {
        email: parsed.data.email,
        password: parsed.data.password
      });

      const loginData = res.data?.data;
      const token = loginData?.token;
      const admin = loginData?.admin;

      if (!token || !admin) {
        alert("Backend tra ve du lieu dang nhap khong dung dinh dang mong doi.");
        return;
      }

      localStorage.setItem("access_token", token);
      localStorage.setItem(adminStorageKey, JSON.stringify(admin));
      window.location.href = "/home";

    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setServerError(error.response?.data?.message || "Tên đăng nhập hoặc mật khẩu không chính xác");
      } else {
        setServerError("Đã có lỗi xảy ra, vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Đăng nhập">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Trường nhập Email */}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="example@gmail.com" 
            value={formData.email}
            onChange={(event) => {
              const value = event.target.value;
              setFormData((current) => ({ ...current, email: value }));
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            className={fieldErrors.email ? "border-red-500" : ""}
          />
          {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
        </div>

        {/* Trường nhập Mật khẩu (Có nút Mắt) */}
        <div className="space-y-2 relative">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} // Switch type
              placeholder="••••••••"
              value={formData.password}
              onChange={(event) => {
                const value = event.target.value;
                setFormData((current) => ({ ...current, password: value }));
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              className={fieldErrors.password ? "border-red-500 pr-10" : "pr-10"}
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
          {fieldErrors.password && <p className="text-sm text-red-500">{fieldErrors.password}</p>}
        </div>

        {/* Remember me & Quên mật khẩu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked) => setFormData((current) => ({ ...current, rememberMe: checked === true }))}
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal">Remember me</Label>
          </div>
          <Link 
            to="/forgot-password" 
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

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