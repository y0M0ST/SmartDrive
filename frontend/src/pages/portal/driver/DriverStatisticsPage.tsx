/**
 * US_17 — Thống kê điểm an toàn & thu nhập dự kiến (Cổng tài xế).
 *
 * PHẦN 1 — Backend `GET /api/driver/statistics` (không sửa BE):
 * 1) Cards: `final_safety_score` (0–100 hoặc null), `completed_trips`, `total_violations_in_month` (null nếu chưa có driver_scores),
 *    `monthly_estimated_income_vnd`, cộng thêm `salary_configured`, hệ số lương nullable.
 * 2) Charts: `charts.safety_score_by_week[]` (week_index, label, score, deducted_points, trips_completed) và
 *    `charts.estimated_income_by_week[]` (estimated_income_vnd, ...).
 * 3) Query: `month` (YYYY-MM) **tùy chọn** — bỏ trống = tháng hiện tại (VN) ở controller.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BarChart3, Loader2, PieChart } from "lucide-react";
import { driverApi, unwrapDriverStatistics } from "@/services/driverApi";
import type { DriverStatisticsPayload } from "@/types/driverStatistics";
import { vnCurrentYearMonth, vnYearMonthOptions } from "@/lib/vnDateRange";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ChartsLazy = lazy(async () => {
  const m = await import("@/components/driver-portal/statistics/DriverStatisticsCharts");
  return { default: m.DriverStatisticsCharts };
});

const VND_FULL = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const MONTH_OPTIONS = vnYearMonthOptions(18);

function ymDisplayLabel(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `Tháng ${Number(m)}/${y}`;
}

function finiteOr(n: unknown, fallback: number): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

/** Có tín hiệu nghiệp vụ để hiển thị biểu đồ (tránh vẽ “phẳng tuyệt đối” nhưng vẫn có ý nghĩa). */
function hasMeaningfulStatistics(c: DriverStatisticsPayload["cards"]): boolean {
  if (finiteOr(c.monthly_estimated_income_vnd, 0) > 0) return true;
  if (finiteOr(c.completed_trips, 0) > 0) return true;
  if (finiteOr(c.total_deducted_points, 0) > 0) return true;
  if (finiteOr(c.total_violations_in_month, 0) > 0) return true;
  const fs = c.final_safety_score;
  if (fs != null && Number.isFinite(fs) && fs < 100) return true;
  return false;
}

function scoreAccent(score: number | null): { text: string; box: string } {
  if (score == null || !Number.isFinite(score)) {
    return {
      text: "text-slate-600 dark:text-slate-300",
      box: "ring-slate-200/80 dark:ring-slate-600/60",
    };
  }
  if (score < 50) {
    return {
      text: "text-red-600 dark:text-red-400",
      box: "ring-red-300/90 dark:ring-red-900/50",
    };
  }
  if (score < 80) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      box: "ring-amber-300/80 dark:ring-amber-900/40",
    };
  }
  return {
    text: "text-emerald-600 dark:text-emerald-400",
    box: "ring-emerald-300/80 dark:ring-emerald-900/40",
  };
}

function StatCard({
  title,
  value,
  hint,
  className,
  valueClassName,
}: {
  title: string;
  value: ReactNode;
  hint?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-600/50 dark:bg-[#1e293b]",
        "md:border-border md:bg-card",
        className,
      )}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p
        className={cn(
          "mt-2 break-words text-2xl font-black tabular-nums tracking-tight text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-5 pb-4 md:max-w-3xl md:space-y-6 md:pb-0">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/80" />
      </div>
      <div className="h-24 animate-pulse rounded-2xl bg-muted/70" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/70" />
        ))}
      </div>
      <div className="h-[300px] animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-[300px] animate-pulse rounded-2xl bg-muted/60" />
    </div>
  );
}

function ChartsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-gradient-to-b from-slate-50 to-white px-5 py-14 text-center dark:border-slate-600 dark:from-slate-900/40 dark:to-[#1e293b]">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-teal-600/10 ring-2 ring-teal-600/15 dark:bg-teal-400/10 dark:ring-teal-400/20">
        <PieChart className="size-10 text-teal-600 dark:text-teal-400" strokeWidth={1.25} aria-hidden />
      </div>
      <h2 className="text-base font-black tracking-tight text-foreground">Chưa có dữ liệu thống kê cho khoảng thời gian này</h2>
      <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-muted-foreground">
        Tháng đang chọn chưa có chuyến hoàn thành hoặc vi phạm ghi nhận — các chỉ số tổng quan hiển thị 0 hoặc “—”.
      </p>
    </div>
  );
}

export default function DriverStatisticsPage() {
  const [month, setMonth] = useState(() => vnCurrentYearMonth());
  const [payload, setPayload] = useState<DriverStatisticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driverApi.getStatistics({ month });
      const parsed = unwrapDriverStatistics(res);
      if (!parsed) {
        setPayload(null);
        toast.error("Không đọc được dữ liệu thống kê từ máy chủ.");
        return;
      }
      setPayload(parsed);
    } catch (e: unknown) {
      setPayload(null);
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "")
          : "";
      toast.error(msg || "Không tải được thống kê.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = payload?.cards;
  const charts = payload?.charts;

  const showCharts = useMemo(() => {
    if (!cards || !charts) return false;
    return hasMeaningfulStatistics(cards);
  }, [cards, charts]);

  const scoreStyle = useMemo(() => scoreAccent(cards?.final_safety_score ?? null), [cards?.final_safety_score]);

  const safetyDisplay = useMemo(() => {
    const s = cards?.final_safety_score;
    if (s == null || !Number.isFinite(s)) return "—";
    return String(Math.round(s));
  }, [cards?.final_safety_score]);

  const tripsDisplay = useMemo(() => String(finiteOr(cards?.completed_trips, 0)), [cards?.completed_trips]);

  const violationsDisplay = useMemo(() => {
    const v = cards?.total_violations_in_month;
    if (v == null) return "—";
    if (!Number.isFinite(v)) return "—";
    return String(Math.round(v));
  }, [cards?.total_violations_in_month]);

  const incomeDisplay = useMemo(() => {
    return VND_FULL.format(finiteOr(cards?.monthly_estimated_income_vnd, 0));
  }, [cards?.monthly_estimated_income_vnd]);

  if (loading && !payload) {
    return <PageSkeleton />;
  }

  if (!loading && !payload) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center md:max-w-3xl">
        <p className="text-sm font-semibold text-foreground">Không tải được thống kê.</p>
        <p className="text-xs text-muted-foreground">Kiểm tra kết nối hoặc đăng nhập lại.</p>
        <Button type="button" className="rounded-xl font-bold" onClick={() => void load()}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 pb-4 md:max-w-3xl md:space-y-6 md:pb-0">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground md:text-3xl">
          <BarChart3 className="size-7 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
          Thống kê
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Điểm an toàn & thu nhập dự kiến theo tháng (lịch Việt Nam).
        </p>
      </div>

      <div
        className={cn(
          "space-y-2 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-600/50 dark:bg-[#1e293b]",
          "md:border-border md:bg-card md:shadow-none",
        )}
      >
        <Label htmlFor="driver-stat-month" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Tháng xem thống kê
        </Label>
        <Select value={month} onValueChange={setMonth} disabled={loading}>
          <SelectTrigger
            id="driver-stat-month"
            className="h-11 w-full rounded-xl border-slate-200 bg-white text-[15px] font-semibold dark:border-slate-600 dark:bg-slate-900/60"
          >
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {MONTH_OPTIONS.map((ym) => (
              <SelectItem key={ym} value={ym} className="rounded-lg font-medium">
                {ymDisplayLabel(ym)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && payload ? (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Đang cập nhật…
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          title="Điểm an toàn"
          value={<span className={cn("tabular-nums", scoreStyle.text)}>{safetyDisplay}</span>}
          hint={cards?.final_safety_score == null ? "Chưa có bản ghi điểm tháng trên hệ thống." : "Theo driver_scores tháng."}
          className={cn("ring-2 ring-inset", scoreStyle.box)}
        />
        <StatCard title="Tổng chuyến (hoàn thành)" value={tripsDisplay} hint="Trong tháng đã chọn." />
        <StatCard title="Tổng vi phạm" value={violationsDisplay} hint="Theo bản ghi tháng (nếu có)." />
        <StatCard
          title="Thu nhập dự kiến"
          value={incomeDisplay}
          hint="Ước tính theo cấu hình nhà xe."
          valueClassName="text-[clamp(0.95rem,3.8vw,1.4rem)] leading-snug"
        />
      </div>

      {!cards || !charts ? null : showCharts ? (
        <Suspense
          fallback={
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
              <p className="text-sm font-medium">Đang tải biểu đồ…</p>
            </div>
          }
        >
          <ChartsLazy safetyRows={charts.safety_score_by_week} incomeRows={charts.estimated_income_by_week} />
        </Suspense>
      ) : (
        <ChartsEmptyState />
      )}
    </div>
  );
}
