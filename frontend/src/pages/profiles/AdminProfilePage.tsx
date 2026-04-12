import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import * as Icons from "lucide-react";

import {
  profileApi,
  getProfileApiErrorMessage,
  type MeUser,
} from "@/services/profileApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const nameSchema = z.object({
  full_name: z.string().min(1, "Họ tên không được để trống").max(200).trim(),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu cũ"),
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới phải từ 6 ký tự")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
      .regex(/[0-9]/, "Cần ít nhất 1 chữ số")
      .regex(/[@$!%*?&]/, "Cần ít nhất 1 ký tự đặc biệt"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.oldPassword, {
    message: "Mật khẩu mới không được trùng mật khẩu cũ",
    path: ["newPassword"],
  });

type NameFormValues = z.infer<typeof nameSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

function mergeUserInfoIntoStorage(partial: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem("user_info");
    const cur = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem("user_info", JSON.stringify({ ...cur, ...partial }));
  } catch {
    /* ignore */
  }
}

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeUser | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [nameSaving, setNameSaving] = useState(false);

  const [contactOpen, setContactOpen] = useState(false);
  const [contactKind, setContactKind] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [contactStep, setContactStep] = useState<1 | 2>(1);
  const [newContactValue, setNewContactValue] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [otp, setOtp] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const [isPassSuccessOpen, setIsPassSuccessOpen] = useState(false);
  const [showPass, setShowPass] = useState({ old: false, new: false, conf: false });

  const formName = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { full_name: "" },
  });

  const formPassword = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const loadMe = useCallback(async () => {
    setPageLoading(true);
    try {
      const data = await profileApi.getMe();
      setMe(data);
      formName.reset({ full_name: data.full_name });
      mergeUserInfoIntoStorage({
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        agency_id: data.agency_id,
        phone: data.phone,
      });
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 401) return;
      toast.error(getProfileApiErrorMessage(e));
      setMe(null);
    } finally {
      setPageLoading(false);
    }
  }, [formName]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const resetContactDialog = () => {
    setContactStep(1);
    setNewContactValue("");
    setOtp("");
    setOtpHint("");
    setRequestSubmitting(false);
    setVerifySubmitting(false);
  };

  const openContactDialog = (kind: "EMAIL" | "PHONE") => {
    resetContactDialog();
    setContactKind(kind);
    setContactOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setContactOpen(open);
    if (!open) resetContactDialog();
  };

  const onSaveName = async (values: NameFormValues) => {
    setNameSaving(true);
    try {
      const { full_name } = await profileApi.patchProfile({ full_name: values.full_name });
      setMe((prev) => (prev ? { ...prev, full_name } : prev));
      mergeUserInfoIntoStorage({ full_name });
      formName.reset({ full_name });
      toast.success("Đã cập nhật họ tên.");
    } catch (e) {
      toast.error(getProfileApiErrorMessage(e));
    } finally {
      setNameSaving(false);
    }
  };

  const onRequestOtp = async () => {
    const trimmed = newContactValue.trim();
    if (contactKind === "EMAIL") {
      const r = z.string().email("Email không hợp lệ").safeParse(trimmed);
      if (!r.success) {
        toast.error(r.error.issues[0]?.message ?? "Email không hợp lệ");
        return;
      }
    } else {
      const r = z.string().min(10, "Số điện thoại ít nhất 10 ký tự").max(20).safeParse(trimmed);
      if (!r.success) {
        toast.error(r.error.issues[0]?.message ?? "Số điện thoại không hợp lệ");
        return;
      }
    }

    setRequestSubmitting(true);
    try {
      const body =
        contactKind === "EMAIL"
          ? ({ kind: "EMAIL" as const, newEmail: trimmed.toLowerCase() })
          : ({ kind: "PHONE" as const, newPhone: trimmed });
      const res = await profileApi.requestContactChange(body);
      setOtpHint(res.sentToMasked);
      setContactStep(2);
      toast.success(res.message || "Đã gửi mã xác nhận.");
    } catch (e) {
      const ax = e instanceof AxiosError ? e : null;
      const status = ax?.response?.status;
      const msg = getProfileApiErrorMessage(e);
      if (status === 429) {
        toast.error("Gửi mã quá nhanh", { description: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setRequestSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    const digits = otp.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }
    setVerifySubmitting(true);
    try {
      const res = await profileApi.verifyContactChange({ kind: contactKind, otp: digits });
      setMe((prev) => (prev ? { ...prev, email: res.email, phone: res.phone } : prev));
      mergeUserInfoIntoStorage({ email: res.email, phone: res.phone });
      setContactOpen(false);
      resetContactDialog();
      toast.success("Đã cập nhật email / số điện thoại.");
    } catch (e) {
      toast.error(getProfileApiErrorMessage(e));
    } finally {
      setVerifySubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      await profileApi.changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      formPassword.reset();
      setIsPassSuccessOpen(true);
    } catch (error: unknown) {
      const ax = error instanceof AxiosError;
      const message = ax && error.response?.status === 401
        ? "Mật khẩu hiện tại không chính xác."
        : getProfileApiErrorMessage(error);
      toast.error(message);
    }
  };

  const togglePass = (key: keyof typeof showPass) =>
    setShowPass((prev) => ({ ...prev, [key]: !prev[key] }));

  if (pageLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Không tải được hồ sơ</CardTitle>
            <CardDescription>Vui lòng thử lại hoặc đăng nhập lại.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => void loadMe()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabTriggerClass =
    "relative h-12 flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none ring-0 transition-colors " +
    "hover:text-foreground " +
    "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 " +
    "data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:font-semibold data-[state=active]:text-foreground " +
    "dark:data-[state=active]:bg-primary/10";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Thông tin của tôi
        </h1>
        <p className="text-sm text-muted-foreground">
          Quản lý họ tên, liên hệ và mật khẩu đăng nhập.
        </p>
      </div>

      {/* Một khung Card: tab bar cố định phía trên, vùng nội dung min-height ổn định — tránh giật layout */}
      <Card className="overflow-hidden border-border shadow-sm">
        <Tabs defaultValue="personal" className="flex w-full flex-col gap-0">
          <div className="shrink-0 border-b border-border bg-muted/30 px-1 dark:bg-muted/20">
            <TabsList
              variant="line"
              className="flex h-auto min-h-12 w-full flex-row justify-stretch gap-0 rounded-none border-0 bg-transparent p-0"
            >
              <TabsTrigger value="personal" className={tabTriggerClass}>
                <Icons.User className="mr-2 size-4 shrink-0" />
                Thông tin cá nhân
              </TabsTrigger>
              <TabsTrigger value="security" className={tabTriggerClass}>
                <Icons.Shield className="mr-2 size-4 shrink-0" />
                Bảo mật & Đăng nhập
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chiều cao cố định + scroll: hai tab đổi nhau không làm cả khung co giật */}
          <div className="h-[min(34rem,78vh)] w-full overflow-y-auto sm:h-[min(36rem,76vh)] md:h-[min(38rem,74vh)]">
            <TabsContent
              value="personal"
              forceMount
              className="m-0 flex flex-col outline-none data-[state=inactive]:hidden"
            >
              <CardContent className="flex flex-col gap-8 p-6 md:p-8">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Thông tin cá nhân</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Họ tên hiển thị và thông tin liên hệ tài khoản.
                  </p>
                </div>

                <form onSubmit={formName.handleSubmit(onSaveName)} className="flex max-w-xl flex-col gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Họ và tên</Label>
                    <Input
                      id="full_name"
                      {...formName.register("full_name")}
                      autoComplete="name"
                    />
                    {formName.formState.errors.full_name && (
                      <p className="text-xs font-medium text-destructive">
                        {formName.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Button type="submit" disabled={nameSaving || !formName.formState.isDirty}>
                      {nameSaving ? (
                        <>
                          <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                          Đang lưu…
                        </>
                      ) : (
                        "Lưu họ tên"
                      )}
                    </Button>
                  </div>
                </form>

                <Separator />

                <div className="flex max-w-xl flex-col gap-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label>Email</Label>
                      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground">
                        {me.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 self-start sm:self-end"
                      onClick={() => openContactDialog("EMAIL")}
                    >
                      Thay đổi
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label>Số điện thoại</Label>
                      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground">
                        {me.phone || "—"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 self-start sm:self-end"
                      onClick={() => openContactDialog("PHONE")}
                    >
                      Thay đổi
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent
              value="security"
              forceMount
              className="m-0 flex flex-col outline-none data-[state=inactive]:hidden"
            >
              <CardContent className="flex flex-col gap-8 p-6 md:p-8">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Bảo mật & Đăng nhập</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Đổi mật khẩu đăng nhập. Sau khi đổi mật khẩu bạn cần đăng nhập lại.
                  </p>
                </div>

                <form
                  onSubmit={formPassword.handleSubmit(onPasswordSubmit)}
                  className="flex max-w-xl flex-1 flex-col gap-5"
                >
                  {(
                    [
                      { id: "oldPassword" as const, label: "Mật khẩu hiện tại", key: "old" as const },
                      { id: "newPassword" as const, label: "Mật khẩu mới", key: "new" as const },
                      { id: "confirmPassword" as const, label: "Xác nhận mật khẩu", key: "conf" as const },
                    ] as const
                  ).map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="font-medium">{field.label}</Label>
                      <div className="relative">
                        <Input
                          type={showPass[field.key] ? "text" : "password"}
                          {...formPassword.register(field.id)}
                          className="pr-10"
                          placeholder="••••••••"
                          autoComplete={
                            field.id === "oldPassword" ? "current-password" : "new-password"
                          }
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => togglePass(field.key)}
                          aria-label={showPass[field.key] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                          {showPass[field.key] ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                        </button>
                      </div>
                      {formPassword.formState.errors[field.id] && (
                        <p className="text-xs font-medium text-destructive">
                          {formPassword.formState.errors[field.id]?.message}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={formPassword.formState.isSubmitting}
                      className="w-full max-w-xl sm:w-auto sm:min-w-[12rem]"
                    >
                      {formPassword.formState.isSubmitting ? (
                        <>
                          <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                          Đang xử lý…
                        </>
                      ) : (
                        "Cập nhật mật khẩu"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <Dialog open={contactOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {contactKind === "EMAIL" ? "Đổi email" : "Đổi số điện thoại"}
            </DialogTitle>
            {contactStep === 1 ? (
              <DialogDescription>
                {contactKind === "EMAIL"
                  ? "Nhập địa chỉ email mới. Mã OTP sẽ được gửi tới email mới để xác minh."
                  : "Nhập số điện thoại mới. Mã OTP sẽ được gửi tới email hiện tại của bạn."}
              </DialogDescription>
            ) : (
              <DialogDescription>
                Mã OTP đã được gửi về email{" "}
                <span className="font-semibold text-foreground">{otpHint || "đã đăng ký"}</span>.
                Nhập 6 chữ số để hoàn tất.
              </DialogDescription>
            )}
          </DialogHeader>

          {contactStep === 1 ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="new-contact">{contactKind === "EMAIL" ? "Email mới" : "Số điện thoại mới"}</Label>
                <Input
                  id="new-contact"
                  value={newContactValue}
                  onChange={(e) => setNewContactValue(e.target.value)}
                  type={contactKind === "EMAIL" ? "email" : "tel"}
                  placeholder={contactKind === "EMAIL" ? "ten@example.com" : "0xxxxxxxxx"}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="button" onClick={() => void onRequestOtp()} disabled={requestSubmitting}>
                  {requestSubmitting ? (
                    <>
                      <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                      Đang gửi…
                    </>
                  ) : (
                    "Gửi mã xác nhận"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="otp">Mã OTP (6 số)</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="text-center font-mono text-lg tracking-[0.35em]"
                />
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start sm:mr-auto"
                  onClick={() => {
                    setContactStep(1);
                    setOtp("");
                  }}
                  disabled={verifySubmitting}
                >
                  Quay lại
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                    Hủy
                  </Button>
                  <Button type="button" onClick={() => void onVerifyOtp()} disabled={verifySubmitting}>
                    {verifySubmitting ? (
                      <>
                        <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                        Đang xác nhận…
                      </>
                    ) : (
                      "Xác nhận"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isPassSuccessOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Icons.Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Cập nhật thành công</h2>
              <p className="text-sm text-muted-foreground">
                Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại để tiếp tục.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setIsPassSuccessOpen(false);
                localStorage.clear();
                navigate("/login");
              }}
            >
              Đăng nhập lại
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
