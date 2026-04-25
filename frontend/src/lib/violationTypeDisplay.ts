import type { ViolationTypeCode } from "@/types/violation";

export const VIOLATION_TYPE_LABEL: Record<ViolationTypeCode, string> = {
  DROWSY: "Buồn ngủ",
  DISTRACTED: "Mất tập trung",
};

export function violationTypeBadgeClass(type: string, isDark: boolean): string {
  const t = type as ViolationTypeCode;
  if (t === "DROWSY") {
    return isDark
      ? "border-amber-900/50 bg-amber-950/40 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (t === "DISTRACTED") {
    return isDark
      ? "border-violet-900/50 bg-violet-950/40 text-violet-200"
      : "border-violet-200 bg-violet-50 text-violet-900";
  }
  return isDark ? "border-border bg-muted text-muted-foreground" : "border-border bg-muted text-foreground";
}
