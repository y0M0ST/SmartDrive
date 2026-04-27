import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { performLogout } from "@/lib/performLogout";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

/**
 * US_02 — tự đăng xuất sau 12h không hoạt động (chỉ khi đang có access_token và không ở trang auth).
 */
export function SessionIdleWatcher() {
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPublicAuthRoute =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password");

  useEffect(() => {
    if (isPublicAuthRoute) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const arm = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void performLogout({ manual: false });
      }, TWELVE_HOURS_MS);
    };

    arm();

    const onActivity = () => {
      arm();
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [location.pathname, isPublicAuthRoute]);

  return null;
}
