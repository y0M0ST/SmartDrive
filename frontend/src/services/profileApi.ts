import { AxiosError } from "axios";
import api from "./api";

/** Khớp `GET /api/auth/me` */
export type MeUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  agency_id: string | null;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

function unwrapData<T>(res: { data: ApiEnvelope<T> }, fallbackMsg = "Phản hồi không hợp lệ"): T {
  const body = res.data;
  if (body?.status === "success" && body.data !== undefined && body.data !== null) {
    return body.data;
  }
  throw new Error(typeof body?.message === "string" ? body.message : fallbackMsg);
}

export type ContactChangeRequestBody =
  | { kind: "EMAIL"; newEmail: string }
  | { kind: "PHONE"; newPhone: string };

export type ContactChangeRequestResult = {
  message: string;
  sentToMasked: string;
  expiresInMinutes: number;
};

export type ContactChangeVerifyBody = {
  kind: "EMAIL" | "PHONE";
  otp: string;
};

export type ContactChangeVerifyResult = {
  email: string;
  phone: string;
};

/** Lấy message từ lỗi API (400, 429, …) */
export function getProfileApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const d = error.response?.data as ApiEnvelope<unknown> & { details?: unknown };
    if (typeof d?.message === "string" && d.message.trim()) return d.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Đã có lỗi xảy ra.";
}

export const profileApi = {
  getMe: async (): Promise<MeUser> => {
    const res = await api.get<ApiEnvelope<MeUser>>("/auth/me");
    return unwrapData(res, "Không tải được thông tin tài khoản.");
  },

  patchProfile: async (body: { full_name: string }): Promise<{ full_name: string }> => {
    const res = await api.patch<ApiEnvelope<{ full_name: string }>>("/auth/me/profile", body);
    return unwrapData(res);
  },

  requestContactChange: async (body: ContactChangeRequestBody): Promise<ContactChangeRequestResult> => {
    const res = await api.post<ApiEnvelope<ContactChangeRequestResult>>(
      "/auth/me/contact-change/request",
      body
    );
    return unwrapData(res);
  },

  verifyContactChange: async (body: ContactChangeVerifyBody): Promise<ContactChangeVerifyResult> => {
    const res = await api.post<ApiEnvelope<ContactChangeVerifyResult>>(
      "/auth/me/contact-change/verify",
      body
    );
    return unwrapData(res);
  },

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
      confirmNewPassword: data.newPassword,
    }),
};
