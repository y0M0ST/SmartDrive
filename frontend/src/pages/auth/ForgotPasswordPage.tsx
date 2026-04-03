import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/ui/layout/AuthLayout";
import api from "@/services/api";

// 1. Định nghĩa các Schema Validation cho 3 bước
const emailSchema = z.object({ email: z.string().email("Email không hợp lệ") });
const otpSchema = z.object({ otp: z.string().length(6, "Mã OTP phải có 6 số") });
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"]
});

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(""); 
  const [otpCode, setOtpCode] = useState(""); // Lưu OTP tạm thời ở FE

  // --- BƯỚC A: GỬI OTP (Khớp Swagger: /api/auth/forgot-password) ---
  const { register: regEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErr } } = useForm({
    resolver: zodResolver(emailSchema)
  });

  const onEmailSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Backend của Minh dùng link này:
      await api.post("/api/auth/forgot-password", { email: data.email });
      setEmail(data.email);
      toast.success("Mã OTP đã được gửi về Email!");
      setStep('otp'); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Email không tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC B: CHỈ LƯU OTP (Không gọi API vì Backend gộp chung vào bước cuối) ---
  const { register: regOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErr } } = useForm({
    resolver: zodResolver(otpSchema)
  });

  // Sửa lại hàm onOtpSubmit ở Bước B
const onOtpSubmit = async (data: any) => {
  setOtpCode(data.otp); 
    setStep('reset');
};

  // --- BƯỚC C: RESET PASSWORD (Khớp Swagger: /api/auth/reset-password) ---
  const { register: regReset, handleSubmit: handleResetSubmit, formState: { errors: resetErr } } = useForm({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onResetSubmit = async (data: any) => {
  setLoading(true);
  try {
    // Backend sẽ kiểm tra OTP + Email + Pass mới ở ĐÂY
    await api.post("/api/auth/reset-password", { 
      email: email, 
      otp: otpCode, // Mã 741482 bạn nhập ở bước trước
      new_password: data.password,
      confirm_password: data.confirmPassword
    });

    toast.success("Đổi mật khẩu thành công!");
    navigate("/login");
  } catch (error: any) {
    // Nếu OTP sai, lúc này Backend mới báo lỗi 400
    toast.error(error.response?.data?.message || "Mã OTP không chính xác hoặc hết hạn.");
  } finally {
    setLoading(false);
  }
};
  return (
    <AuthLayout title={
      step === 'email' ? 'Forgot your password?' : 
      step === 'otp' ? 'Verify code' : 
      'Set a password'
    }>
      
      {/* Nút quay lại Login */}
      <Link to="/login" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} className="mr-2" /> Back to sign in
      </Link>

      {/* --- FORM BƯỚC A: EMAIL --- */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-6">
          <p className="text-sm text-gray-600">
            Nhập email của bạn để nhận mã xác nhận đổi mật khẩu.
          </p>
          <div className="space-y-2 relative">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Input 
                id="email" 
                type="email" 
                placeholder="example@gmail.com" 
                {...regEmail("email")}
                className={emailErr.email ? "border-red-500 pl-10" : "pl-10"}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            {emailErr.email && <p className="text-sm text-red-500">{emailErr.email.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-gray-900 text-white" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "Submit"}
          </Button>
        </form>
      )}

      {/* --- FORM BƯỚC B: OTP --- */}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-6">
          <p className="text-sm text-gray-600">
            Chúng tôi đã gửi mã xác nhận đến email <span className="font-medium text-gray-900">{email}</span>. Vui lòng kiểm tra và nhập mã vào đây.
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp">Verify code (OTP)</Label>
            <Input 
              id="otp" 
              type="text" 
              placeholder="123456" 
              maxLength={6}
              {...regOtp("otp")}
              className={otpErr.otp ? "border-red-500 text-center text-2xl tracking-widest font-bold" : "text-center text-2xl tracking-widest font-bold"}
            />
            {otpErr.otp && <p className="text-sm text-red-500">{otpErr.otp.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-gray-900 text-white" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "Verify"}
          </Button>
          <p className="text-center text-sm text-gray-600">
            Didn't receive a code? <button type="button" className="text-blue-600 hover:underline" onClick={() => setStep('email')}>Resend</button>
          </p>
        </form>
      )}

      {/* --- FORM BƯỚC C: NEW PASSWORD --- */}
      {step === 'reset' && (
        <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-6">
          <p className="text-sm text-gray-600">Vui lòng nhập mật khẩu mới.</p>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <Input id="password" type="password" {...regReset("password")} className={resetErr.password ? "border-red-500 pr-10" : "pr-10"} />
            {resetErr.password && <p className="text-sm text-red-500">{resetErr.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <Input id="confirmPassword" type="password" {...regReset("confirmPassword")} className={resetErr.confirmPassword ? "border-red-500 pr-10" : "pr-10"} />
            {resetErr.confirmPassword && <p className="text-sm text-red-500">{resetErr.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-gray-900 text-white" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "Set password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}