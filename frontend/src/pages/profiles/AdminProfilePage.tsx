import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { profileApi } from "@/services/profileApi";
// 1. ĐỔI IMPORT: Dùng sonner thay vì useToast của shadcn
import { toast } from "sonner"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import * as Icons from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(1, "Họ tên không được để trống"),
  dob: z.string().optional(),
  gender: z.string().optional(),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu cũ"),
  newPassword: z.string()
    .min(6, "Mật khẩu mới phải từ 6 ký tự")
    .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Cần ít nhất 1 chữ số")
    .regex(/[@$!%*?&]/, "Cần ít nhất 1 ký tự đặc biệt"),
  confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"]
}).refine(data => data.newPassword !== data.oldPassword, {
  message: "Mật khẩu mới không được trùng mật khẩu cũ",
  path: ["newPassword"]
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AdminProfilePage() {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPass, setShowPass] = useState({ old: false, new: false, conf: false });

  const formProfile = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });
  const formPassword = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    const loadData = () => {
      setLoadingProfile(true);
      try {
        const userInfo = localStorage.getItem("user_info");
        const userData = userInfo ? JSON.parse(userInfo) : null;
        if (userData) {
          formProfile.reset({
            name: userData.full_name || userData.name || "",
            dob: userData.dob || "",
            gender: userData.gender || "Nam"
          });
        }
      } catch (error) {
        console.error("Lỗi đọc LocalStorage", error);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadData();
  }, [formProfile]);

  // 2. XỬ LÝ TOAST CHO PROFILE
  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      // Giả sử có api update ở đây
      toast.success("Đã cập nhật thông tin cá nhân thành công!");
      setEditing(false);
    } catch (error) {
      toast.error("Cập nhật thông tin thất bại!");
    }
  };

  // 3. XỬ LÝ TOAST CHO PASSWORD
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      const res = await profileApi.changePassword({ 
        oldPassword: data.oldPassword, 
        newPassword: data.newPassword 
      });

      // Nếu không lỗi, Sonner sẽ hiện màu xanh rực rỡ
      toast.success("Mật khẩu đã được thay đổi thành công!");
      formPassword.reset();
    } catch (error: any) {
      const message = error.response?.status === 401 
        ? "Mật khẩu cũ không chính xác!" 
        : "Đổi mật khẩu thất bại, vui lòng thử lại.";
      
      // Hiện toast lỗi màu đỏ
      toast.error(message);
    }
  };

  const togglePass = (key: keyof typeof showPass) => setShowPass(prev => ({ ...prev, [key]: !prev[key] }));

  if (loadingProfile) {
    return (
      <div className="space-y-6 animate-pulse p-8">
        <div className="h-10 w-48 bg-slate-200 rounded-lg mb-8"></div>
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-3 h-80 bg-slate-100 rounded-3xl"></div>
          <div className="col-span-2 h-80 bg-slate-100 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">Cấu hình tài khoản</h1>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <Card className="xl:col-span-3 border-none shadow-xl rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between p-8 border-b">
            <CardTitle className="text-xl font-bold">Thông tin cá nhân</CardTitle>
            <Button variant="ghost" onClick={() => setEditing(!editing)}>
              <Icons.Pencil className="h-5 w-5 text-blue-600" />
            </Button>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Họ và tên</Label>
                <Input {...formProfile.register("name")} disabled={!editing} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Giới tính</Label>
                <Input value={formProfile.getValues("gender")} disabled className="rounded-xl bg-slate-50" />
              </div>
            </div>
            {editing && (
              <Button className="bg-blue-600 w-full rounded-xl" onClick={formProfile.handleSubmit(onProfileSubmit)}>
                Lưu thay đổi
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 border-none shadow-xl rounded-3xl">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <CardTitle className="text-xl font-bold">Bảo mật</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={formPassword.handleSubmit(onPasswordSubmit)} className="space-y-5">
              {[
                { id: "oldPassword", label: "Mật khẩu hiện tại", key: "old" as const },
                { id: "newPassword", label: "Mật khẩu mới", key: "new" as const },
                { id: "confirmPassword", label: "Xác nhận mật khẩu", key: "conf" as const }
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label className="font-semibold">{field.label}</Label>
                  <div className="relative">
                    <Input 
                      type={showPass[field.key] ? "text" : "password"}
                      {...formPassword.register(field.id as keyof PasswordFormValues)}
                      className="rounded-xl pr-10"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => togglePass(field.key)}
                    >
                      {showPass[field.key] ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                  {formPassword.formState.errors[field.id as keyof PasswordFormValues] && (
                    <p className="text-xs text-red-500 font-medium">{formPassword.formState.errors[field.id as keyof PasswordFormValues]?.message}</p>
                  )}
                </div>
              ))}
              <Button 
                type="submit" 
                disabled={formPassword.formState.isSubmitting}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold rounded-xl h-12 mt-4"
              >
                {formPassword.formState.isSubmitting ? "ĐANG XỬ LÝ..." : "CẬP NHẬT MẬT KHẨU"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}