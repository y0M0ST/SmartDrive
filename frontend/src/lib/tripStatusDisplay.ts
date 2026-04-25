import type { TripStatusCode } from "@/types/trip";
import { cn } from "@/lib/utils";

export const TRIP_STATUS_LABEL: Record<TripStatusCode, string> = {
  SCHEDULED: "Đã lên lịch",
  IN_PROGRESS: "Đang chạy",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

/** Đồng bộ màu Badge với `TripList`. */
export function tripStatusBadgeClass(status: TripStatusCode): string {
  switch (status) {
    case "SCHEDULED":
      return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200";
      
    case "IN_PROGRESS":
      return "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200";
      
    case "COMPLETED":
      return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200";
      
    case "CANCELLED":
      return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/50 dark:text-rose-200";
  }
}

export function tripStatusBadgeCn(status: TripStatusCode): string {
  return cn("font-semibold shadow-none", tripStatusBadgeClass(status));
}

/**
 * Badge trạng thái trên cổng tài xế — chuyến đang chạy nổi bật (xanh đậm + pulse).
 */
export function tripStatusBadgeCnForDriver(status: TripStatusCode): string {
  if (status === "IN_PROGRESS") {
    return cn(
      "font-semibold shadow-md",
      "border-2 border-blue-800 bg-blue-800 text-white",
      "animate-pulse",
      "dark:border-blue-500 dark:bg-blue-600",
    );
  }
  return tripStatusBadgeCn(status);
}
