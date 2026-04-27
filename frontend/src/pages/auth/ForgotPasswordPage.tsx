import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/ui/layout/AuthLayout";
import api from "@/services/api";

const emailSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không đúng định dạng"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

function apiMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const d = error.response?.data as { message?: string };
    if (typeof d?.message === "string" && d.message.trim()) return d.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Đã có lỗi xảy ra.";
}

export default function ForgotPasswordPage() {
  const [sentHint, setSentHint] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: EmailFormValues) => {
    try {
      const res = await api.post<{ message?: string; status?: string }>("/auth/forgot-password", {
        email: data.email.trim().toLowerCase(),
      });
      const msg =
        typeof res.data?.message === "string" && res.data.message.trim()
          ? res.data.message
          : "Nếu email hợp lệ, hệ thống đã gửi đường dẫn khôi phục. Vui lòng kiểm tra hộp thư.";
      setSentHint(true);
      toast.success(msg);
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  return (
    <AuthLayout title="Quên mật khẩu">
      <Link
        to="/login"
        className="mb-6 inline-flex items-center text-sm text-white/90 hover:text-white"
      >
        <ArrowLeft size={16} className="mr-2" />
        Quay lại đăng nhập
      </Link>

      <p className="mb-6 text-sm text-white/85">
        Nhập email đã đăng ký. Hệ thống sẽ gửi <strong className="font-semibold text-white">liên kết đặt lại mật khẩu</strong>{" "}
        (hiệu lực 15 phút). Vì lý do bảo mật, kết quả hiển thị giống nhau dù email có trong hệ thống hay không.
      </p>

      {sentHint && (
        <p className="mb-4 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white/90">
          Nếu bạn chưa thấy thư, hãy kiểm tra thư mục spam hoặc gửi lại sau vài phút.
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/95">
            Email
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="border-white/30 bg-white/10 pl-10 text-white placeholder:text-white/50"
              placeholder="ten@example.com"
              {...form.register("email")}
            />
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-white/50" />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-red-200">{form.formState.errors.email.message}</p>
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
              Đang gửi…
            </>
          ) : (
            "Gửi liên kết khôi phục"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
