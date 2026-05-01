import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { AxiosError, isAxiosError } from "axios";
import { adminApi } from "@/services/adminApi";
import { driverApi } from "@/services/driverApi";

const LICENSE_CLASSES = ["B", "C", "D", "E", "F"] as const;
const MAX_IMAGES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type StagedShot = { file: File; preview: string };

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}

const FloatingInput = ({
  label,
  value,
  onChange,
  error,
  placeholder = "",
  type = "text",
  readOnly = false,
  required = true,
}: FloatingInputProps) => (
  <div className="relative mt-5">
    <label
      className={`absolute -top-2.5 left-3 z-10 bg-card px-1 text-[13px] font-medium transition-colors ${
        error ? "text-red-500" : "text-muted-foreground"
      }`}
    >
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full rounded-lg border px-4 py-3 text-sm text-foreground outline-none transition-all ${
        error
          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-100"
          : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
      } ${readOnly ? "bg-muted" : "bg-background"}`}
    />
    {error && <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">{error}</p>}
  </div>
);

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialData?: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
    status?: string;
    /** Từ danh sách user (BE join driver_profiles) — hiển thị tạm khi đang tải chi tiết */
    driver_code?: string | null;
    has_driver_profile?: boolean;
  };
  onSuccess: () => void;
}

function errMsg(e: unknown, fb: string): string {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fb;
}

/** API bọc `{ data, message, status }` hoặc trả thẳng object hồ sơ */
function unwrapProfileBody(resData: unknown): Record<string, unknown> | null {
  if (!resData || typeof resData !== "object") return null;
  const o = resData as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return o;
}

function pickProfileField(obj: Record<string, unknown>, snake: string, camel: string): string {
  const a = obj[snake];
  const b = obj[camel];
  const v = a !== undefined && a !== null && String(a).trim() !== "" ? a : b;
  if (v === undefined || v === null) return "";
  return String(v);
}

function expiryUiState(ymd: string): "empty" | "expired" | "soon" | "ok" {
  if (!ymd?.trim()) return "empty";
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return "empty";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "ok";
}

const DriverModal = ({ isOpen, onClose, mode, initialData, onSuccess }: DriverModalProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    idCard: "",
    licenseClass: "",
    expiryDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  /** Một state duy nhất: tránh cập nhật preview bên trong updater của file (lỗi hiển thị ảnh đầu tiên). */
  const [staged, setStaged] = useState<StagedShot[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [driverCode, setDriverCode] = useState("");
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  const expiryHint = useMemo(() => expiryUiState(formData.expiryDate), [formData.expiryDate]);

  const resetStaged = useCallback(() => {
    setStaged((prev) => {
      prev.forEach((s) => {
        if (s.preview.startsWith("blob:")) URL.revokeObjectURL(s.preview);
      });
      return [];
    });
  }, []);

  const addStagedFile = useCallback((file: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type) || file.size > MAX_FILE_BYTES) {
      toast.error("Chỉ chấp nhận ảnh .jpg hoặc .png, tối đa 5MB mỗi file.");
      return;
    }
    let added = false;
    setStaged((prev) => {
      if (prev.length >= MAX_IMAGES) {
        toast.error(`Tối đa ${MAX_IMAGES} ảnh chân dung mỗi lần.`);
        return prev;
      }
      added = true;
      return [...prev, { file, preview: URL.createObjectURL(file) }];
    });
    if (added) setErrors((er) => ({ ...er, avatar: "" }));
  }, []);

  const removeStaged = (index: number) => {
    setStaged((prev) => {
      const row = prev[index];
      if (row?.preview.startsWith("blob:")) URL.revokeObjectURL(row.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    resetStaged();
    setErrors({});
    setApiWarning(null);
    setProfileError(null);
    setHasProfile(null);
    setDriverCode("");
    setExistingImageUrls([]);
    if (mode === "edit") setProfileLoading(true);
    else setProfileLoading(false);

    if (mode === "edit" && initialData) {
      setFormData({
        fullName: initialData.full_name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        idCard: "",
        licenseClass: "",
        expiryDate: "",
      });
      if (initialData.driver_code) setDriverCode(String(initialData.driver_code));
    } else {
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        idCard: "",
        licenseClass: "",
        expiryDate: "",
      });
    }
  }, [
    isOpen,
    mode,
    initialData?.id,
    initialData?.full_name,
    initialData?.email,
    initialData?.phone,
    initialData?.driver_code,
    resetStaged,
  ]);

  const loadDriverProfile = useCallback(async () => {
    const uid = initialData?.id;
    if (!uid) return;
    setProfileLoading(true);
    setProfileError(null);
    setHasProfile(null);
    try {
      const res = await driverApi.getProfile(uid);
      const data = unwrapProfileBody(res.data);
      if (!data) {
        setHasProfile(false);
        setDriverCode("");
        setExistingImageUrls([]);
        setApiWarning(null);
        return;
      }
      const code = pickProfileField(data, "driver_code", "driverCode");
      const imgs = Array.isArray(data.images)
        ? (data.images as { image_url?: string }[]).map((x) => x.image_url || "").filter(Boolean)
        : [];
      setHasProfile(true);
      setDriverCode(code);
      setExistingImageUrls(imgs);
      setFormData((prev) => ({
        ...prev,
        idCard: pickProfileField(data, "id_card", "idCard"),
        licenseClass: pickProfileField(data, "license_class", "licenseClass"),
        expiryDate: (() => {
          const exp = pickProfileField(data, "license_expires_at", "licenseExpiresAt");
          return exp ? exp.split("T")[0] : "";
        })(),
      }));
      const warn = pickProfileField(data, "warning_status", "warningStatus");
      setApiWarning(warn || null);
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.status === 404) {
        setHasProfile(false);
        setDriverCode("");
        setExistingImageUrls([]);
        setApiWarning(null);
        return;
      }
      setProfileError(errMsg(e, "Không tải được hồ sơ tài xế. Thử lại hoặc kiểm tra quyền / mạng."));
      setHasProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [initialData?.id]);

  useEffect(() => {
    if (!isOpen || mode !== "edit" || !initialData?.id) return;
    void loadDriverProfile();
  }, [isOpen, mode, initialData?.id, loadDriverProfile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (mode === "edit" && profileLoading) return false;

    if (!formData.fullName.trim()) newErrors.fullName = "Họ và tên không được bỏ trống";
    if (!formData.email.trim()) newErrors.email = "Email không được bỏ trống";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) newErrors.email = "Email không hợp lệ";
    if (!formData.phone.trim()) newErrors.phone = "Số điện thoại không được bỏ trống";

    if (mode === "edit" && profileError) {
      toast.error("Chưa tải được hồ sơ. Bấm «Thử lại tải hồ sơ» rồi mới Lưu.");
      setErrors(newErrors);
      return false;
    }
    if (mode === "edit" && hasProfile === null) {
      toast.error("Đang tải hồ sơ, vui lòng đợi.");
      setErrors(newErrors);
      return false;
    }

    /** Hồ sơ GPLX/CMND/ảnh: chỉ khi sửa tài xế (admin bổ sung sau khi đã có tài khoản). */
    if (mode === "edit") {
      const digits = formData.idCard.replace(/\D/g, "");
      if (!digits || digits.length < 9 || digits.length > 12) {
        newErrors.idCard = "CMND/CCCD cần 9–12 chữ số";
      }
      if (!formData.licenseClass.trim()) newErrors.licenseClass = "Vui lòng chọn hạng bằng lái";
      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = "Ngày hết hạn không được bỏ trống";
      } else {
        const selectedDate = new Date(formData.expiryDate);
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate <= today) newErrors.expiryDate = "Ngày hết hạn phải nằm trong tương lai";
      }
    }

    if (mode === "edit" && hasProfile === false) {
      if (staged.length < 1) newErrors.avatar = "Bắt buộc có ít nhất 1 ảnh chân dung để tạo hồ sơ nhận diện";
    }

    if (mode === "edit" && hasProfile === true) {
      if (existingImageUrls.length < 1 && staged.length < 1) {
        newErrors.avatar = "Hồ sơ cần ít nhất một ảnh khuôn mặt";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const appendProfileFields = (fd: FormData) => {
    fd.append("id_card", formData.idCard.replace(/\D/g, ""));
    fd.append("license_class", formData.licenseClass);
    fd.append("license_expires_at", new Date(formData.expiryDate).toISOString());
    staged.forEach((s) => fd.append("images", s.file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (mode === "edit" && initialData?.id) {
        await adminApi.update(initialData.id, {
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        });

        if (hasProfile) {
          const fd = new FormData();
          appendProfileFields(fd);
          await driverApi.updateProfile(initialData.id, fd);
          toast.success("Đã cập nhật tài khoản và hồ sơ (đồng bộ nhận diện).");
        } else if (hasProfile === false) {
          const fd = new FormData();
          fd.append("user_id", initialData.id);
          appendProfileFields(fd);
          await driverApi.createProfile(fd);
          toast.success("Đã cập nhật tài khoản và tạo hồ sơ tài xế lần đầu.");
        }

        onClose();
        setTimeout(() => onSuccess(), 0);
        return;
      }

      const rolesRes = await adminApi.getRoles();
      const roles = (rolesRes.data?.data || []) as { id: string; name: string }[];
      const driverRoleId = roles.find((r) => r.name === "DRIVER")?.id;
      if (!driverRoleId) {
        toast.error("Không tải được vai trò tài xế. Thử lại sau.");
        return;
      }

      await adminApi.create({
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role_id: driverRoleId,
      });

      toast.success(
        "Đã tạo tài khoản tài xế. Mật khẩu tạm đã gửi tới email đăng nhập — không ai xem được mật khẩu trong hệ thống. Sau này hãy bấm Sửa để bổ sung hồ sơ (CMND, GPLX, ảnh).",
        { duration: 10_000 },
      );

      onClose();
      setTimeout(() => onSuccess(), 0);
    } catch (error: unknown) {
      toast.error(errMsg(error, "Thao tác thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  const onFilesPicked = (list: FileList | null) => {
    if (!list?.length) return;
    Array.from(list).forEach((f) => addStagedFile(f));
  };

  if (!isOpen) return null;

  const showProfileForm = mode === "edit" && !profileLoading && !profileError && hasProfile !== null;

  const listDriverCode = initialData?.driver_code ? String(initialData.driver_code) : "";
  const driverCodeDisplay =
    mode === "edit"
      ? profileError
        ? "— (lỗi tải hồ sơ)"
        : profileLoading && listDriverCode
          ? `${listDriverCode} (đang tải chi tiết…)`
          : profileLoading
            ? "Đang tải…"
            : hasProfile && driverCode
              ? driverCode
              : hasProfile === false
                ? "Chưa có hồ sơ — điền thông tin bên dưới để sinh mã TX"
                : "—"
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
          aria-label="Đóng"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 pb-2 pt-8 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {mode === "add" ? "Thêm tài khoản tài xế" : "Quản lý tài xế & hồ sơ"}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {mode === "add"
              ? "Chỉ cần họ tên, email và số điện thoại. Hệ thống gửi mật khẩu tạm qua email — không hiển thị và không lưu để admin xem. Hồ sơ (CMND, GPLX, ảnh) bổ sung sau khi bấm Sửa."
              : "Cập nhật tài khoản đăng nhập và hồ sơ tài xế (CMND, GPLX, ảnh chân dung) khi đã có tài khoản."}
          </p>
        </div>

        <div className="overflow-y-auto px-8 pb-8 sm:px-10">
          {mode === "edit" && profileLoading && (
            <p className="mb-4 text-center text-sm text-muted-foreground">Đang tải hồ sơ…</p>
          )}
          {mode === "edit" && profileError && !profileLoading && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
              <p>{profileError}</p>
              <button
                type="button"
                className="mt-2 font-bold text-primary underline"
                onClick={() => void loadDriverProfile()}
              >
                Thử lại tải hồ sơ
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col">
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tài khoản đăng nhập</p>
            <FloatingInput
              label="Họ và tên"
              value={formData.fullName}
              onChange={(v) => handleChange("fullName", v)}
              error={errors.fullName}
            />
            <FloatingInput
              label="Email đăng nhập"
              value={formData.email}
              onChange={(v) => handleChange("email", v)}
              error={errors.email}
              type="email"
            />
            <FloatingInput
              label="Số điện thoại"
              value={formData.phone}
              onChange={(v) => handleChange("phone", v)}
              error={errors.phone}
            />

            {mode === "add" && (
              <p className="mt-4 rounded-xl border border-border bg-muted/50 px-3 py-2 text-left text-[11px] leading-relaxed text-muted-foreground">
                Sau khi tạo xong, vào danh sách tài xế → <span className="font-bold text-foreground">Sửa</span> để
                nhập hồ sơ bằng lái và ảnh phục vụ nhận diện.
              </p>
            )}

            {showProfileForm && (
              <>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hồ sơ tài xế</p>
                  {mode === "edit" && (
                    <FloatingInput
                      label="Mã tài xế (hệ thống)"
                      value={driverCodeDisplay}
                      onChange={() => {}}
                      readOnly
                      required={false}
                    />
                  )}
                  {(apiWarning === "EXPIRED" || expiryHint === "expired") && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                      Bằng lái đã hết hạn — cần cập nhật ngày hết hạn mới (trong tương lai) và kiểm tra ảnh chân dung.
                    </div>
                  )}
                  {(apiWarning === "EXPIRING_SOON" || expiryHint === "soon") &&
                    apiWarning !== "EXPIRED" &&
                    expiryHint !== "expired" && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
                        Bằng lái sắp hết hạn (trong 30 ngày) — nên gia hạn hoặc nâng hạng kịp thời.
                      </div>
                    )}

                  <FloatingInput
                    label="CMND/CCCD (9–12 số)"
                    value={formData.idCard}
                    onChange={(v) => handleChange("idCard", v)}
                    error={errors.idCard}
                  />

                  <div className="relative mt-5">
                    <label
                      className={`absolute -top-2.5 left-3 z-10 bg-card px-1 text-[13px] font-medium ${
                        errors.licenseClass ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      Hạng bằng lái <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.licenseClass}
                      onChange={(e) => handleChange("licenseClass", e.target.value)}
                      className={`w-full appearance-none rounded-lg border bg-background px-4 py-3 pr-10 text-sm text-foreground outline-none transition-all ${
                        errors.licenseClass ? "border-red-500" : "border-border focus:border-primary"
                      }`}
                    >
                      <option value="">Chọn hạng</option>
                      {LICENSE_CLASSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    {errors.licenseClass && (
                      <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">{errors.licenseClass}</p>
                    )}
                  </div>

                  <FloatingInput
                    label="Ngày hết hạn bằng lái"
                    value={formData.expiryDate}
                    onChange={(v) => handleChange("expiryDate", v)}
                    error={errors.expiryDate}
                    type="date"
                  />
                </div>

                <div className="relative mt-5">
                  <label
                    className={`absolute -top-2.5 left-3 z-10 bg-card px-1 text-[13px] font-medium ${
                      errors.avatar ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    Ảnh chân dung (1–3 ảnh) <span className="text-red-500">*</span>
                  </label>
                  {mode === "edit" && existingImageUrls.length > 0 && (
                    <p className="mb-2 mt-6 text-[11px] text-muted-foreground">
                      Ảnh đang lưu. Tải ảnh mới bên dưới sẽ thay toàn bộ ảnh đã lưu (tối đa {MAX_IMAGES} ảnh mới mỗi lần).
                    </p>
                  )}
                  {mode === "edit" && existingImageUrls.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {existingImageUrls.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="Đã lưu"
                          className="size-20 rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div
                    onDragOver={(ev) => {
                      ev.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      setIsDragging(false);
                      onFilesPicked(ev.dataTransfer.files);
                    }}
                    className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-all ${
                      errors.avatar
                        ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                        : isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/40"
                    }`}
                  >
                    <div className="flex flex-wrap justify-center gap-2">
                      {staged.map((s, i) => (
                        <div key={`${s.preview}-${i}`} className="relative">
                          <img src={s.preview} alt="" className="size-20 rounded-lg border border-border object-cover" />
                          <button
                            type="button"
                            className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                            onClick={() => removeStaged(i)}
                          >
                            <span className="sr-only">Xóa</span>×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-[13px] font-bold text-primary"
                      onClick={() => document.getElementById("driverModalFiles")?.click()}
                    >
                      {staged.length ? "Thêm ảnh" : "Chọn hoặc kéo thả ảnh"}
                    </button>
                    <input
                      id="driverModalFiles"
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={(ev) => {
                        onFilesPicked(ev.target.files);
                        ev.target.value = "";
                      }}
                    />
                  </div>
                  {errors.avatar && <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">{errors.avatar}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">Định dạng .jpg hoặc .png, tối đa 5MB mỗi ảnh.</p>
                </div>
              </>
            )}

            <div className="mt-8 flex justify-center">
              <button
                type="submit"
                disabled={
                  submitting ||
                  (mode === "edit" && (profileLoading || !!profileError || hasProfile === null))
                }
                className="rounded-xl bg-primary px-10 py-3 font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "Đang xử lý…" : mode === "add" ? "Tạo tài khoản & gửi email" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverModal;
