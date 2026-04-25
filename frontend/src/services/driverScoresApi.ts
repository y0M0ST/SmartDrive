import api from "./api";
import type { DriverHistoryPayload, LeaderboardPayload } from "@/types/driverScores";

export type LeaderboardParams = {
  month?: string;
  sort?: "asc" | "desc";
};

export function unwrapLeaderboard(res: { data?: { data?: LeaderboardPayload } }): LeaderboardPayload | null {
  const inner = res.data?.data;
  if (!inner || !Array.isArray(inner.entries)) return null;
  if (typeof inner.evaluation_month !== "string") return null;
  return inner as LeaderboardPayload;
}

export function unwrapDriverHistory(res: { data?: { data?: DriverHistoryPayload } }): DriverHistoryPayload | null {
  const inner = res.data?.data;
  if (!inner || !Array.isArray(inner.violations)) return null;
  if (typeof inner.driver_id !== "string" || typeof inner.evaluation_month !== "string") return null;
  return inner as DriverHistoryPayload;
}

export const driverScoresApi = {
  getLeaderboard: (params: LeaderboardParams) =>
    api.get("/scores/leaderboard", {
      params: {
        ...(params.month?.trim() ? { month: params.month.trim() } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
      },
    }),

  getDriverViolationHistory: (driverId: string, month: string) =>
    api.get(`/scores/driver/${driverId}/history`, {
      params: { month: month.trim() },
    }),
};
