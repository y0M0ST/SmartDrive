import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgencyDashboardPayload } from "@/types/agencyReports";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import { parseYmdUtcNoon, VN_IANA } from "@/lib/vnDateRange";

export type AgencyReportChartsProps = {
  charts: AgencyDashboardPayload["charts"];
  violationsByType: AgencyDashboardPayload["summary"]["violationsByType"];
  totalViolations: number;
  className?: string;
};

const PIE_COLORS: Record<string, string> = {
  DROWSY: "#f59e0b",
  DISTRACTED: "#8b5cf6",
};

function violationLabel(type: string): string {
  if (type === "DROWSY") return "Buồn ngủ";
  if (type === "DISTRACTED") return "Mất tập trung";
  return type;
}

function formatDayTick(ymd: string): string {
  try {
    return formatInTimeZone(parseYmdUtcNoon(ymd), VN_IANA, "dd/MM");
  } catch {
    return ymd;
  }
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

export function AgencyReportCharts({
  charts,
  violationsByType,
  totalViolations,
  className,
}: AgencyReportChartsProps) {
  const pieData = useMemo(() => {
    const rows = Array.isArray(violationsByType) ? violationsByType : [];
    return rows
      .filter((r) => Number(r.count) > 0)
      .map((r) => ({
        name: violationLabel(r.type),
        type: r.type,
        value: Number(r.count),
      }));
  }, [violationsByType]);

  const trendData = useMemo(() => {
    const trips = Array.isArray(charts.tripsByDay) ? charts.tripsByDay : [];
    const viol = Array.isArray(charts.violationsByDay) ? charts.violationsByDay : [];
    const violByDate = new Map(viol.map((v) => [v.date, v.violations]));
    if (trips.length > 0) {
      return trips.map((t) => ({
        date: t.date,
        dayLabel: formatDayTick(t.date),
        completedTrips: t.completedTrips,
        violations: violByDate.get(t.date) ?? 0,
      }));
    }
    if (viol.length > 0) {
      return viol.map((v) => ({
        date: v.date,
        dayLabel: formatDayTick(v.date),
        completedTrips: 0,
        violations: v.violations,
      }));
    }
    return [];
  }, [charts.tripsByDay, charts.violationsByDay]);

  const wrapClass = cn(
    "w-full max-w-full min-w-0 space-y-10 overflow-x-hidden",
    "[&_.recharts-wrapper]:max-w-full [&_.recharts-surface]:max-w-full",
    className,
  );

  return (
    <div className={wrapClass}>
      <section className="min-w-0 space-y-2" aria-labelledby="agency-chart-trend">
        <h2 id="agency-chart-trend" className="text-sm font-extrabold tracking-tight text-foreground">
          Xu hướng chuyến đi và vi phạm
        </h2>
        <p className="text-xs text-muted-foreground">
          Số chuyến hoàn thành và số vi phạm theo ngày trong khoảng đã chọn (múi giờ Việt Nam).
        </p>
        {trendData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Không có điểm dữ liệu theo ngày trong khoảng đã chọn.
          </div>
        ) : (
          <div className="h-[300px] w-full min-w-0 max-w-full min-h-[300px]">
            {/*
              Recharts 3: với width="100%", lần đầu containerWidth = -1 → chart không render.
              initialDimension dương đảm bảo có frame đầu; ResizeObserver chỉnh lại theo layout thật.
            */}
            <ResponsiveContainer
              width="100%"
              height={300}
              minWidth={0}
              initialDimension={{ width: 480, height: 300 }}
            >
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 10 }} interval="preserveStartEnd" height={32} />
                <YAxis width={40} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, maxWidth: "min(280px, 92vw)" }}
                  formatter={(value, name) => {
                    const n = tooltipNumericValue(value);
                    const label = name === "completedTrips" ? "Chuyến hoàn thành" : "Vi phạm";
                    return [n, label] as [ReactNode, string];
                  }}
                  labelFormatter={(_label, payload) => {
                    const row = payload[0]?.payload as { date?: string } | undefined;
                    return row?.date ? `Ngày ${row.date}` : "";
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => (value === "completedTrips" ? "Chuyến hoàn thành" : "Vi phạm")}
                />
                <Bar dataKey="completedTrips" name="completedTrips" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="violations" name="violations" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-2" aria-labelledby="agency-chart-pie">
        <h2 id="agency-chart-pie" className="text-sm font-extrabold tracking-tight text-foreground">
          Cơ cấu loại vi phạm
        </h2>
        <p className="text-xs text-muted-foreground">Tỷ lệ buồn ngủ và mất tập trung trong tổng vi phạm.</p>
        {totalViolations <= 0 || pieData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Không có dữ liệu vi phạm trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <div className="h-[300px] w-full min-w-0 max-w-full min-h-[300px]">
            <ResponsiveContainer
              width="100%"
              height={300}
              minWidth={0}
              initialDimension={{ width: 480, height: 300 }}
            >
              <PieChart>
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(value, _name, item) => {
                    const v = tooltipNumericValue(value);
                    const type = item.payload?.type as string | undefined;
                    const slice = type ? violationsByType.find((s) => s.type === type) : undefined;
                    const pct = slice && Number.isFinite(slice.percent) ? `${slice.percent}%` : "";
                    return [`${v} lượt${pct ? ` (${pct})` : ""}`, "Số lượng"] as [ReactNode, string];
                  }}
                />
                <Legend formatter={(value) => value} />
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                  {pieData.map((entry) => (
                    <Cell key={entry.type} fill={PIE_COLORS[entry.type] ?? "#64748b"} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
