import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  const [step, setStep] = useState<Step>('email'); // Trạng thái bước hiện tại
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(""); // Lưu email để dùng cho bước sau

  // --- BƯỚC A: NHẬP EMAIL ---
  const { register: regEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErr } } = useForm({
    resolver: zodResolver(emailSchema)
  });

  const onEmailSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Gọi API gửi OTP (Thay bằng link API thật)
      await api.post("/auth/forgot-password/send-otp", { email: data.email });
      setEmail(data.email);
      setStep('otp'); // Chuyển sang bước nhập OTP
    } catch (error: any) {
      // Ngoại lệ: Email không tồn tại
      alert(error.response?.data?.message || "Email không tồn tại trong hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC B: XÁC THỰC OTP (Verify Code) ---
  const { register: regOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErr } } = useForm({
    resolver: zodResolver(otpSchema)
  });

  const onOtpSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Gọi API xác thực OTP (API trả về 1 token tạm thời để đổi pass)
      const res = await api.post("/auth/forgot-password/verify-otp", { email, otp: data.otp });
      localStorage.setItem("reset_token", res.data.reset_token); // Lưu token tạm
      setStep('reset'); // Chuyển sang bước đặt mật khẩu mới
    } catch (error: any) {
      alert("Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC C: ĐẶT LẠI MẬT KHẨU MỚI ---
  const { register: regReset, handleSubmit: handleResetSubmit, formState: { errors: resetErr } } = useForm({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onResetSubmit = async (data: any) => {
    setLoading(true);
    try {
      const resetToken = localStorage.getItem("reset_token");
      // Gọi API đặt mật khẩu mới (gửi kèm token tạm)
      await api.post("/auth/forgot-password/reset-password", { 
        token: resetToken, 
        password: data.password 
      });
      alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      localStorage.removeItem("reset_token"); // Xóa token tạm
      navigate("/login"); // Về trang đăng nhập
    } catch (error: any) {
      alert(error.response?.data?.message || "Link khôi phục đã hết hạn. Vui lòng thử lại.");
      setStep('email'); // Đá về bước 1
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