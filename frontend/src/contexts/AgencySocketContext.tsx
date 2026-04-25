import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { isSuperAdmin, readStoredUserRole } from "@/lib/adminAccess";
import { socketOriginFromApiBase } from "@/lib/socketOrigin";
import { playViolationAlertSound } from "@/lib/violationAlertSound";
import { violationsInboxApi, unwrapViolationsUnread } from "@/services/violationsInboxApi";
import type { AiViolationAlertPayload, ViolationUnreadItem } from "@/types/violationsInbox";
import { ViolationSocketToastCard } from "@/components/agency/ViolationSocketToastCard";
import { isTripGpsSocketPayload } from "@/types/tripTracking";
import { ingestTripGpsUpdate } from "@/lib/tripGpsLiveStore";

function isAiViolationAlertPayload(raw: unknown): raw is AiViolationAlertPayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o.violation_id === "string" && typeof o.image_url === "string";
}

export type AgencySocketContextValue = {
  agencySocketEnabled: boolean;
  unreadCount: number;
  unreadItems: ViolationUnreadItem[];
  unreadLoading: boolean;
  refreshUnread: () => Promise<void>;
  acknowledgeViolation: (violationId: string) => Promise<void>;
};

const AgencySocketContext = createContext<AgencySocketContextValue | null>(null);

export function useAgencySocket(): AgencySocketContextValue {
  const v = useContext(AgencySocketContext);
  if (!v) {
    throw new Error("useAgencySocket chỉ dùng bên trong AgencySocketProvider.");
  }
  return v;
}

export function AgencySocketProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("access_token"));
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadItems, setUnreadItems] = useState<ViolationUnreadItem[]>([]);
  const [unreadLoading, setUnreadLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const burstGuardRef = useRef<Map<string, number>>(new Map());
  const acknowledgeRef = useRef<(id: string) => Promise<void>>(async () => {});

  useEffect(() => {
    const sync = () => setAuthToken(localStorage.getItem("access_token"));
    window.addEventListener("storage", sync);
    window.addEventListener("smartdrive:auth", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("smartdrive:auth", sync);
    };
  }, []);

  const role = readStoredUserRole();
  const agencySocketEnabled =
    !!authToken && !isSuperAdmin(role) && (role === "AGENCY_ADMIN" || role === "DISPATCHER");

  const refreshUnread = useCallback(async () => {
    if (!agencySocketEnabled) {
      setUnreadCount(0);
      setUnreadItems([]);
      return;
    }
    setUnreadLoading(true);
    try {
      const res = await violationsInboxApi.getUnread(50);
      const parsed = unwrapViolationsUnread(res);
      if (!parsed) {
        setUnreadCount(0);
        setUnreadItems([]);
        return;
      }
      setUnreadCount(parsed.unread_count);
      setUnreadItems(parsed.items);
    } catch {
      setUnreadCount(0);
      setUnreadItems([]);
    } finally {
      setUnreadLoading(false);
    }
  }, [agencySocketEnabled]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  const acknowledgeViolation = useCallback(
    async (violationId: string) => {
      await violationsInboxApi.acknowledge(violationId);
      await refreshUnread();
    },
    [refreshUnread],
  );

  acknowledgeRef.current = acknowledgeViolation;

  useEffect(() => {
    if (!agencySocketEnabled || !authToken) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const origin = socketOriginFromApiBase();
    const socket = io(origin, {
      auth: { token: authToken },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const onAlert = (raw: unknown) => {
      if (!isAiViolationAlertPayload(raw)) return;
      const now = Date.now();
      const last = burstGuardRef.current.get(raw.violation_id) ?? 0;
      if (now - last < 800) return;
      burstGuardRef.current.set(raw.violation_id, now);

      playViolationAlertSound();
      void refreshUnread();

      toast.custom(
        (id) => (
          <ViolationSocketToastCard
            payload={raw}
            toastId={id}
            onConfirm={() => acknowledgeRef.current(raw.violation_id)}
          />
        ),
        { duration: 120_000 },
      );
    };

    const onTripGps = (raw: unknown) => {
      if (!isTripGpsSocketPayload(raw)) return;
      ingestTripGpsUpdate(raw);
    };

    socket.on("ai_violation_alert", onAlert);
    socket.on("trip_gps_update", onTripGps);

    return () => {
      socket.off("ai_violation_alert", onAlert);
      socket.off("trip_gps_update", onTripGps);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [agencySocketEnabled, authToken, refreshUnread]);

  const value = useMemo(
    () => ({
      agencySocketEnabled,
      unreadCount,
      unreadItems,
      unreadLoading,
      refreshUnread,
      acknowledgeViolation,
    }),
    [agencySocketEnabled, unreadCount, unreadItems, unreadLoading, refreshUnread, acknowledgeViolation],
  );

  return <AgencySocketContext.Provider value={value}>{children}</AgencySocketContext.Provider>;
}
