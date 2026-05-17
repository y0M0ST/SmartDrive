/**
 * Socket.io kết nối tới origin HTTP của API (cùng host Render, không có path `/api`).
 * `VITE_API_URL` VD: https://smartdrive-api.onrender.com/api → origin https://smartdrive-api.onrender.com
 */
export function socketOriginFromApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://localhost:3000/api";
  const normalized = raw.replace(/\/+$/, "");
  try {
    const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}
