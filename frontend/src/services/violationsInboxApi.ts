import api from "./api";
import type { ViolationsUnreadPayload } from "@/types/violationsInbox";

export function unwrapViolationsUnread(res: {
  data?: { data?: ViolationsUnreadPayload };
}): ViolationsUnreadPayload | null {
  const inner = res.data?.data;
  if (!inner || typeof inner !== "object") return null;
  if (typeof inner.unread_count !== "number" || !Array.isArray(inner.items)) return null;
  return inner as ViolationsUnreadPayload;
}

export const violationsInboxApi = {
  getUnread: (limit = 50) => api.get("/violations/unread", { params: { limit } }),

  acknowledge: (violationId: string) => api.patch(`/violations/${violationId}/acknowledge`),
};
