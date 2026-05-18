/** Khớp mã lỗi backend (`AppError.errorCode`) — Face ID / hồ sơ tài xế. */
export const DRIVER_PROFILE_NOT_FOUND_CODE = "DRIVER_PROFILE_NOT_FOUND";
export const FACE_TEMPLATE_NOT_REGISTERED_CODE = "FACE_TEMPLATE_NOT_REGISTERED";

export const NO_DRIVER_PROFILE_MESSAGE =
  "Bạn chưa có hồ sơ tài xế trong hệ thống. Vui lòng liên hệ quản lý nhà xe của bạn để được tạo hồ sơ trước khi đăng ký khuôn mặt và điểm danh.";

export type ParsedFaceApiError = {
  status?: number;
  message: string;
  errorCode?: string;
};

export function parseDriverFaceApiError(error: unknown): ParsedFaceApiError {
  const ax = error as {
    response?: {
      status?: number;
      data?: { message?: string; errorCode?: string | null };
    };
  };
  const status = ax.response?.status;
  const message =
    typeof ax.response?.data?.message === "string" && ax.response.data.message.trim() !== ""
      ? ax.response.data.message.trim()
      : "";
  const errorCode =
    typeof ax.response?.data?.errorCode === "string" && ax.response.data.errorCode.trim() !== ""
      ? ax.response.data.errorCode.trim()
      : undefined;
  return { status, message, errorCode };
}

export function isDriverProfileNotFoundError(error: unknown): boolean {
  const parsed = parseDriverFaceApiError(error);
  if (parsed.errorCode === DRIVER_PROFILE_NOT_FOUND_CODE) return true;
  if (parsed.status !== 404) return false;
  const m = parsed.message.toLowerCase();
  return m.includes("hồ sơ tài xế") || m.includes("ho so tai xe");
}
