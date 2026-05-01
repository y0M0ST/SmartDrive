import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import api from "@/services/api";

/** Khớp `VehicleType` / `VehicleStatus` backend */
export type VehicleTypeCode = "SEAT" | "SLEEPER";
export type VehicleStatusCode = "AVAILABLE" | "IN_SERVICE" | "MAINTENANCE" | "INACTIVE";

/** Dữ liệu mở form sửa — khớp entity BE */
export interface VehicleModalInitial {
  id: string;
  license_plate: string;
  type: VehicleTypeCode;
  capacity: number;
  status: VehicleStatusCode;
  ai_camera_id: string | null;
}

export interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialData?: VehicleModalInitial | null;
  onConfirm: () => void;
}

/** Khớp `vehicle.dto.ts` — không dấu chấm trong biển số */
const VN_PLATE_REGEX = /^[0-9]{2}[A-Z][0-9]?-[0-9]{4,5}$/;

const STATUS_LABELS: Record<VehicleStatusCode, string> = {
  AVAILABLE: "Sẵn sàng",
  IN_SERVICE: "Đang chạy",
  MAINTENANCE: "Bảo dưỡng",
  INACTIVE: "Không hoạt động",
};

type FormState = {
  licensePlate: string;
  type: VehicleTypeCode;
  capacity: 16 | 29 | 45;
  status: VehicleStatusCode;
  aiCameraId: string;
};

const FormInput: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, name, value, onChange, error, placeholder = "", disabled = false }) => (
  <div className="mb-4">
    <label
      htmlFor={name}
      className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300"
    >
      {label}
    </label>
    <input
      type="text"
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all outline-none ${
        disabled ? "cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : ""
      } ${
        error
          ? "border-red-500 bg-red-50 focus:ring-red-100"
          : "border-slate-200 bg-white text-slate-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      }`}
    />
    {error && <p className="mt-1.5 text-[11px] font-bold text-red-600">⚠️ {error}</p>}
  </div>
);

const FormSelect: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string | number }[];
  disabled?: boolean;
}> = ({ label, name, value, onChange, options, disabled }) => (
  <div className="mb-4">
    <label htmlFor={name} className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
      {label}
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

function errMsg(e: unknown, fb: string): string {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fb;
}

const defaultForm = (): FormState => ({
  licensePlate: "",
  type: "SEAT",
  capacity: 16,
  status: "AVAILABLE",
  aiCameraId: "",
});

export default function VehicleModal({ isOpen, onClose, mode, initialData, onConfirm }: VehicleModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormState>(defaultForm);
  /** Trạng thái lúc mở sửa — để PATCH khi đổi */
  const statusOnOpenRef = useRef<VehicleStatusCode | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && initialData) {
      statusOnOpenRef.current = initialData.status;
      setFormData({
        licensePlate: initialData.license_plate || "",
        type: initialData.type,
        capacity: initialData.capacity as 16 | 29 | 45,
        status: initialData.status,
        aiCameraId: initialData.ai_camera_id?.trim() ?? "",
      });
    } else {
      statusOnOpenRef.current = null;
      setFormData(defaultForm());
    }
    setErrors({});
  }, [isOpen, mode, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "capacity"
          ? (parseInt(value, 10) as 16 | 29 | 45)
          : name === "type"
            ? (value as VehicleTypeCode)
            : name === "status"
              ? (value as VehicleStatusCode)
              : value,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const plate = formData.licensePlate.trim().toUpperCase();
    if (!plate) newErrors.licensePlate = "Biển số xe không được bỏ trống";
    else if (!VN_PLATE_REGEX.test(plate)) {
      newErrors.licensePlate = "Định dạng biển số không hợp lệ (VD: 51B-12345, 29A1-12345)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const license_plate = formData.licensePlate.trim().toUpperCase();
    const ai_camera_id =
      formData.aiCameraId.trim().length > 0 ? formData.aiCameraId.trim() : null;

    const body = {
      license_plate,
      type: formData.type,
      capacity: formData.capacity,
      ai_camera_id,
    };

    try {
      if (mode === "add") {
        await api.post("/vehicles", body);
        toast.success("Đã thêm xe mới.");
      } else if (initialData?.id) {
        if (formData.status !== statusOnOpenRef.current) {
          await api.patch(`/vehicles/${initialData.id}/status`, { status: formData.status });
        }
        await api.put(`/vehicles/${initialData.id}`, body);
        toast.success("Đã cập nhật thông tin xe.");
      }
      onClose();
      onConfirm();
    } catch (error: unknown) {
      const status = (error as AxiosError).response?.status;
      if (status === 409) {
        const m = errMsg(error, "").toLowerCase();
        if (m.includes("camera") || m.includes("mã")) {
          toast.error(errMsg(error, "Mã camera đã gắn cho xe khác — gỡ liên kết trước."));
        } else {
          toast.error(errMsg(error, "Biển số đã tồn tại trong nhà xe."));
        }
      } else {
        toast.error(errMsg(error, "Không lưu được dữ liệu."));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 h-full w-full bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg">
        <div className="relative animate-fade-in-up rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-800">
            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">
              {mode === "edit" ? "Cập nhật thông tin xe" : "Thêm xe khách mới"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
            >
              <span className="sr-only">Đóng</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={(ev) => void handleSubmit(ev)}>
            <div className="px-8 pb-4 pt-6">
              <FormInput
                label="Biển số xe"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleInputChange}
                error={errors.licensePlate}
                placeholder="VD: 51B-12345"
              />

              <FormSelect
                label="Loại xe"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                options={[
                  { label: "Ghế ngồi (SEAT)", value: "SEAT" },
                  { label: "Giường nằm (SLEEPER)", value: "SLEEPER" },
                ]}
              />

              <FormSelect
                label="Số chỗ"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                options={[
                  { label: "16 chỗ", value: 16 },
                  { label: "29 chỗ", value: 29 },
                  { label: "45 chỗ", value: 45 },
                ]}
              />

              <FormSelect
                label="Trạng thái"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={mode === "add"}
                options={(Object.keys(STATUS_LABELS) as VehicleStatusCode[]).map((code) => ({
                  label: STATUS_LABELS[code],
                  value: code,
                }))}
              />

              <FormInput
                label="Mã Camera AI"
                name="aiCameraId"
                value={formData.aiCameraId}
                onChange={handleInputChange}
                placeholder="VD: CAM-0009 — để trống nếu chưa gắn"
              />
            </div>

            <div className="flex justify-center border-t border-slate-100 px-8 py-6 dark:border-slate-800">
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-12 py-3 text-sm font-bold uppercase text-white shadow-lg shadow-sky-200 transition-all hover:bg-sky-600 active:scale-95"
              >
                {mode === "edit" ? "Cập nhật" : "Thêm xe mới"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
