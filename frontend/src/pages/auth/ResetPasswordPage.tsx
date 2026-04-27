import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/ui/layout/AuthLayout";
import api from "@/services/api";

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function apiMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const d = error.response?.data as { message?: string };
    if (typeof d?.message === "string" && d.message.trim()) return d.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Đã có lỗi xảy ra.";
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);
  const [show, setShow] = useState({ n: false, c: false });

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = async (values: ResetFormValues) => {
    if (!token) {
      toast.error("Thiếu liên kết khôi phục. Vui lòng mở đường dẫn từ email.");
      return;
    }
    try {
      const res = await api.post<{ message?: string; status?: string }>("/auth/reset-password", {
        token,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });
      const msg =
        typeof res.data?.message === "string" && res.data.message.trim()
          ? res.data.message
          : "Đặt lại mật khẩu thành công.";
      toast.success(msg);
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Đặt lại mật khẩu">
        <Link
          to="/forgot-password"
          className="mb-6 inline-flex items-center text-sm text-white/90 hover:text-white"
        >
          <ArrowLeft size={16} className="mr-2" />
          Yêu cầu gửi lại email
        </Link>
        <p className="text-sm text-white/85">
          Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng dùng chức năng quên mật khẩu để nhận email mới.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu">
      <Link
        to="/login"
        className="mb-6 inline-flex items-center text-sm text-white/90 hover:text-white"
      >
        <ArrowLeft size={16} className="mr-2" />
        Về đăng nhập
      </Link>

      <p className="mb-6 text-sm text-white/85">
        Nhập mật khẩu mới (tối thiểu 6 ký tự). Sau khi thành công bạn sẽ được chuyển về trang đăng nhập.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label className="text-white/95">Mật khẩu mới</Label>
          <div className="relative">
            <Input
              type={show.n ? "text" : "password"}
              autoComplete="new-password"
              className="border-white/30 bg-white/10 pr-10 text-white placeholder:text-white/50"
              placeholder="••••••••"
              {...form.register("newPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              onClick={() => setShow((s) => ({ ...s, n: !s.n }))}
              aria-label={show.n ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {show.n ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.formState.errors.newPassword && (
            <p className="text-sm text-red-200">{form.formState.errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/95">Xác nhận mật khẩu</Label>
          <div className="relative">
            <Input
              type={show.c ? "text" : "password"}
              autoComplete="new-password"
              className="border-white/30 bg-white/10 pr-10 text-white placeholder:text-white/50"
              placeholder="••••••••"
              {...form.register("confirmNewPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              onClick={() => setShow((s) => ({ ...s, c: !s.c }))}
              aria-label={show.c ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {show.c ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.formState.errors.confirmNewPassword && (
            <p className="text-sm text-red-200">{form.formState.errors.confirmNewPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-white text-slate-900 hover:bg-white/90"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lưu…
            </>
          ) : (
            "Đặt lại mật khẩu"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
