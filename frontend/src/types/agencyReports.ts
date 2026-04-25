export type AgencyViolationsByTypeSlice = {
  type: string;
  count: number;
  percent: number;
};

export type AgencyDashboardPayload = {
  range: { startDate: string; endDate: string };
  filters: { driverId: string | null; violationType: string | null };
  summary: {
    totalCompletedTrips: number;
    totalViolations: number;
    violationsByType: AgencyViolationsByTypeSlice[];
    averageSafetyScoreMonthOfEnd: number | null;
    evaluationMonthForScore: string;
  };
  charts: {
    tripsByDay: { date: string; completedTrips: number }[];
    violationsByDay: { date: string; violations: number }[];
  };
};
