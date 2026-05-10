import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DriverStatisticsIncomeWeek, DriverStatisticsSafetyWeek } from "@/types/driverStatistics";
import { cn } from "@/lib/utils";

const VND_TOOLTIP = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export type DriverStatisticsChartsProps = {
  safetyRows: DriverStatisticsSafetyWeek[];
  incomeRows: DriverStatisticsIncomeWeek[];
  className?: string;
};

function safeRows<T>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}

function tooltipNumericValue(value: number | string | ReadonlyArray<number | string> | undefined): number {
  if (value == null) return 0;
  if (Array.isArray(value)) {
    const first = value[0];
    const n = typeof first === "number" ? first : Number(first);
    return Number.isFinite(n) ? n : 0;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function DriverStatisticsCharts({ safetyRows, incomeRows, className }: DriverStatisticsChartsProps) {
  const safety = useMemo(() => {
    return safeRows(safetyRows).map((r) => ({
      ...r,
      weekShort: `T${r.week_index}`,
      scoreN: Number.isFinite(r.score) ? r.score : 0,
    }));
  }, [safetyRows]);

  const income = useMemo(() => {
    return safeRows(incomeRows).map((r) => ({
      ...r,
      weekShort: `T${r.week_index}`,
      incomeN: Number.isFinite(r.estimated_income_vnd) ? r.estimated_income_vnd : 0,
    }));
  }, [incomeRows]);

  return (
    <div
      className={cn(
        "w-full max-w-full min-w-0 space-y-8 overflow-x-hidden",
        /* Tránh Recharts làm body scroll ngang trên iPhone SE */
        "[&_.recharts-wrapper]:max-w-full [&_.recharts-surface]:max-w-full",
        className,
      )}
    >
      <section className="min-w-0 space-y-2" aria-labelledby="chart-safety-title">
        <h2 id="chart-safety-title" className="text-sm font-extrabold tracking-tight text-foreground">
          Điểm an toàn theo tuần
        </h2>
        <p className="text-xs text-muted-foreground">Điểm = max(0, 100 − điểm trừ vi phạm trong tuần).</p>
        <div className="h-[300px] w-full min-w-0 max-w-full min-h-[300px]">
          <ResponsiveContainer
            width="100%"
            height={300}
            minWidth={0}
            initialDimension={{ width: 480, height: 300 }}
          >
            <LineChart data={safety} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" />
              <XAxis
                dataKey="weekShort"
                tick={{ fontSize: 11 }}
                interval={0}
                height={36}
                padding={{ left: 4, right: 4 }}
              />
              <YAxis domain={[0, 100]} width={36} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  fontSize: 12,
                  maxWidth: "min(280px, 92vw)",
                }}
                formatter={(value) => {
                  const n = tooltipNumericValue(value);
                  return [`${n} điểm`, "Điểm"] as [ReactNode, string];
                }}
                labelFormatter={(_label, payload) => {
                  const row = payload[0]?.payload as DriverStatisticsSafetyWeek | undefined;
                  return row?.label ?? "";
                }}
              />
              <Line type="monotone" dataKey="scoreN" name="Điểm" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="min-w-0 space-y-2" aria-labelledby="chart-income-title">
        <h2 id="chart-income-title" className="text-sm font-extrabold tracking-tight text-foreground">
          Thu nhập dự kiến theo tuần
        </h2>
        <p className="text-xs text-muted-foreground">Theo công thức nhà xe (lương cứng chia tuần + thưởng chuyến − phạt điểm).</p>
        <div className="h-[300px] w-full min-w-0 max-w-full min-h-[300px]">
          <ResponsiveContainer
            width="100%"
            height={300}
            minWidth={0}
            initialDimension={{ width: 480, height: 300 }}
          >
            <BarChart data={income} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" vertical={false} />
              <XAxis
                dataKey="weekShort"
                tick={{ fontSize: 11 }}
                interval={0}
                height={36}
                padding={{ left: 4, right: 4 }}
              />
              <YAxis
                width={44}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => {
                  const n = Number(v);
                  if (!Number.isFinite(n)) return "";
                  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}tr`;
                  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
                  return String(n);
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  fontSize: 12,
                  maxWidth: "min(280px, 92vw)",
                }}
                formatter={(value) => {
                  const n = tooltipNumericValue(value);
                  return [VND_TOOLTIP.format(n), "Thu nhập"] as [ReactNode, string];
                }}
                labelFormatter={(_label, payload) => {
                  const row = payload[0]?.payload as DriverStatisticsIncomeWeek | undefined;
                  return row?.label ?? "";
                }}
              />
              <Bar dataKey="incomeN" name="Thu nhập" fill="#0d9488" radius={[8, 8, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
