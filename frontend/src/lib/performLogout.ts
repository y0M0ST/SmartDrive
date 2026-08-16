import { toast } from "sonner";

const AUTH_STORAGE_KEYS = ["access_token", "refresh_token", "user_info"] as const;

/** Thông báo US_02 khi phiên hết hạn / bị thu hồi (401). */
export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại";

export function clearClientAuth(): void {
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  try {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_info");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("smartdrive:auth"));
}

function apiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://localhost:3000/api";
  return raw.replace(/\/$/, "");
}

/** Thu hồi refresh session trên server (user_sessions.revoked_at). Không dùng axios instance để tránh interceptor 401 vòng lặp. */
export async function revokeRefreshSessionOnServer(): Promise<void> {
  const refreshToken = localStorage.getItem("refresh_token")?.trim();
  if (!refreshToken) return;

  try {
    await fetch(`${apiBase()}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* mạng lỗi — vẫn xóa phía client */
  }
}

export type PerformLogoutOptions = {
  /** true = đăng xuất chủ động (không toast hết hạn) */
  manual?: boolean;
};

/**
 * US_02: gọi revoke refresh → xóa JWT/user khỏi storage → chuyển /login (replace).
 * Access token vẫn còn hạn tối đa ~15p nhưng mọi API có authMiddleware sẽ 401 vì session đã revoke.
 */
export async function performLogout(options?: PerformLogoutOptions): Promise<void> {
  const manual = options?.manual ?? true;
  await revokeRefreshSessionOnServer();
  clearClientAuth();
  if (!manual) {
    toast.error(SESSION_EXPIRED_MESSAGE, { duration: 3000 });
  }
  window.location.replace("/login");
}
