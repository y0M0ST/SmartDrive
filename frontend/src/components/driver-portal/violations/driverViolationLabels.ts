import type { DriverViolationListItem } from "@/types/driverViolations";

export function violationTypeLabel(type: string): string {
  switch (type) {
    case "DROWSY":
      return "Buồn ngủ";
    case "DISTRACTED":
      return "Mất tập trung";
    default:
      return type || "Vi phạm";
  }
}

export function violationBadgeClass(type: string): string {
  switch (type) {
    case "DROWSY":
      return "bg-violet-600/15 text-violet-700 ring-violet-600/25 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/30";
    case "DISTRACTED":
      return "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-400/25";
    default:
      return "bg-slate-500/15 text-slate-700 ring-slate-500/20 dark:bg-slate-400/15 dark:text-slate-100 dark:ring-slate-400/25";
  }
}

export function formatViolationCoordinates(v: DriverViolationListItem): string | null {
  const lat = v.coordinates?.latitude;
  const lng = v.coordinates?.longitude;
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
