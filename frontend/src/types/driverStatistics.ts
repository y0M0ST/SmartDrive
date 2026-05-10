/**
 * US_17 — `GET /api/driver/me/statistics` (hoặc `/api/driver/statistics`; ServiceResponse: `response.data.data`).
 * Khớp payload `getDriverMonthlyStatistics` trong `driver-statistics.service.ts`.
 */
export type DriverStatisticsCards = {
  evaluation_month: string;
  salary_configured: boolean;
  base_salary_vnd: number | null;
  bonus_per_trip_vnd: number | null;
  penalty_per_point_vnd: number | null;
  completed_trips: number;
  total_deducted_points: number;
  /** Đếm từ `ai_violations` trong tháng (theo loại). */
  violations_drowsy_in_month?: number;
  violations_distracted_in_month?: number;
  total_violations_in_month: number | null;
  /** Điểm tổng tháng từ `driver_scores` (0–100); `null` nếu chưa có bản ghi. */
  final_safety_score: number | null;
  monthly_estimated_income_vnd: number;
};

export type DriverStatisticsSafetyWeek = {
  week_index: number;
  label: string;
  score: number;
  deducted_points: number;
  trips_completed: number;
};

export type DriverStatisticsIncomeWeek = {
  week_index: number;
  label: string;
  estimated_income_vnd: number;
  trips_completed: number;
  deducted_points: number;
  base_salary_portion_vnd: number;
};

export type DriverStatisticsCharts = {
  safety_score_by_week: DriverStatisticsSafetyWeek[];
  estimated_income_by_week: DriverStatisticsIncomeWeek[];
};

export type DriverStatisticsPayload = {
  cards: DriverStatisticsCards;
  charts: DriverStatisticsCharts;
};
