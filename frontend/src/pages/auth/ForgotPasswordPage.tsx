import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/ui/layout/AuthLayout";
import api from "@/services/api";

// 1. Định nghĩa các Schema Validation
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
  
  // Các State quản lý giao diện
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(""); 
  const [otpCode, setOtpCode] = useState(""); 
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showPass, setShowPass] = useState({ new: false, confirm: false });

  // --- BƯỚC A: GỬI EMAIL ---
  const { register: regEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErr } } = useForm({
    resolver: zodResolver(emailSchema)
  });

  const onEmailSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setEmail(data.email);
      toast.success("Mã OTP đã được gửi về Email!");
      setStep('otp'); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Email không tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC B: NHẬP OTP ---
  const { register: regOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErr } } = useForm({
    resolver: zodResolver(otpSchema)
  });

  const onOtpSubmit = async (data: any) => {
    setOtpCode(data.otp); 
    setStep('reset');
  };

  // --- BƯỚC C: RESET PASSWORD ---
  const { register: regReset, handleSubmit: handleResetSubmit, formState: { errors: resetErr } } = useForm({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onResetSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { 
        email: email, 
        otp: otpCode,
        new_password: data.password,
        confirm_password: data.confirmPassword
      });
      // HIỆN MODAL (TC_Pass_01) - Không navigate ngay ở đây
      setIsSuccessModalOpen(true); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Mã OTP không chính xác.");
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
      
      <Link to="/login" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} className="mr-2" /> Back to sign in
      </Link>

      {/* --- FORM BƯỚC A: EMAIL --- */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-6">
          <p className="text-sm text-gray-600">Nhập email của bạn để nhận mã xác nhận.</p>
          <div className="space-y-2 relative">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Input id="email" {...regEmail("email")} className={emailErr.email ? "border-red-500 pl-10" : "pl-10"} />
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
          <p className="text-sm text-gray-600">Mã đã được gửi đến {email}.</p>
          <div className="space-y-2">
            <Label htmlFor="otp">Verify code (OTP)</Label>
            <Input id="otp" {...regOtp("otp")} maxLength={6} className="text-center text-2xl font-bold tracking-widest" />
            {otpErr.otp && <p className="text-sm text-red-500">{otpErr.otp.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-gray-900 text-white">Verify</Button>
        </form>
      )}

      {/* --- FORM BƯỚC C: RESET PASSWORD --- */}
      {step === 'reset' && (
        <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-6">
          <p className="text-sm text-gray-600">Vui lòng nhập mật khẩu mới.</p>
          
          <div className="space-y-2">
            <Label>Mật khẩu mới</Label>
            <div className="relative">
              <Input 
                type={showPass.new ? "text" : "password"} 
                {...regReset("password")} 
                className="pr-10" 
              />
              <button type="button" onClick={() => setShowPass(p => ({...p, new: !p.new}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {resetErr.password && <p className="text-sm text-red-500">{resetErr.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input 
                type={showPass.confirm ? "text" : "password"} 
                {...regReset("confirmPassword")} 
                className="pr-10" 
              />
              <button type="button" onClick={() => setShowPass(p => ({...p, confirm: !p.confirm}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {resetErr.confirmPassword && <p className="text-sm text-red-500">{resetErr.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-gray-900 text-white" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "Set password"}
          </Button>
        </form>
      )}

      {/* MODAL THÀNH CÔNG (DÁN CUỐI) */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-slate-900">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="text-green-600 w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Thành công!</h2>
              <p className="text-slate-500">Mật khẩu đã được cập nhật. Nhấn OK để quay lại đăng nhập.</p>
            </div>
            <Button 
              onClick={() => navigate("/login")} 
className="w-full h-11 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"            >
              OK, Quay lại Đăng nhập
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}