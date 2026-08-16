/**
 * US_13 — Khớp `LeaderboardEntry` & payload từ `driver-score.service.ts` (ServiceResponse bọc `data`).
 */
export type LeaderboardEntry = {
  driver_id: string;
  full_name: string;
  evaluation_month: string;
  total_violations: number | null;
  total_deducted_points: number | null;
  final_score: number | null;
};

export type LeaderboardPayload = {
  evaluation_month: string;
  sort: string;
  entries: LeaderboardEntry[];
};

export type DriverViolationHistoryItem = {
  id: string;
  type: string;
  occurred_at: string;
  image_url: string;
  points_deducted: number;
  trip_id: string;
};

export type DriverHistoryPayload = {
  driver_id: string;
  evaluation_month: string;
  violations: DriverViolationHistoryItem[];
};
