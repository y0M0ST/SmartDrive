/** Socket.io dùng chung origin với HTTP API (cùng cổng máy chủ Express). */
export function socketOriginFromApiBase(): string {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}
