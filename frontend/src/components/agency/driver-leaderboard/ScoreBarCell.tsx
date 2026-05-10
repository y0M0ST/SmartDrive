import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ScoreBarCellProps = {
  finalScore: number | null;
};

/**
 * Thanh tiến trình 0–100 theo `final_score` (null → xám, không dữ liệu).
 * `final_score === 0`: vạch đỏ full + cảnh báo (khớp yêu cầu US_13).
 */
export function ScoreBarCell({ finalScore }: ScoreBarCellProps) {
  if (finalScore === null || !Number.isFinite(finalScore)) {
    return (
      <div className="flex min-w-[120px] max-w-[220px] flex-col gap-1">
        <span className="text-sm font-bold tabular-nums text-muted-foreground">—</span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" title="Chưa có dữ liệu điểm tháng" />
      </div>
    );
  }

  const clamped = Math.min(100, Math.max(0, finalScore));
  const barColor =
    finalScore <= 0
      ? "bg-red-600"
      : finalScore < 50
        ? "bg-red-500"
        : finalScore < 80
          ? "bg-amber-400"
          : "bg-emerald-500";

  /** Điểm đã clamp 0–100 trên BE; khi về 0: cảnh báo HR nổi bật (không tự đình chỉ). */
  const showHrWarn = finalScore <= 0;

  return (
    <div className="flex min-w-[120px] max-w-[220px] flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-black tabular-nums text-foreground">{Math.round(finalScore)}</span>
        {showHrWarn ? (
          <>
            <AlertTriangle className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
            <span className="text-[11px] font-bold leading-tight text-red-600 dark:text-red-400">
              Khuyến nghị HR xem xét
            </span>
          </>
        ) : null}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", barColor)}
          style={{ width: finalScore <= 0 ? "100%" : `${clamped}%` }}
        />
      </div>
    </div>
  );
}
