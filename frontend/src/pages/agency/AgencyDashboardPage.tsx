/**
 * US_14 — Thống kê tổng quan và xuất báo cáo (Agency).
 *
 * Backend: `GET /api/reports/dashboard`, `GET /api/reports/export-excel` (axios `baseURL` đã gồm `/api`).
 * Không dùng mock; mọi số liệu lấy từ phản hồi API.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FileDown, FileText, Filter, Loader2 } from "lucide-react";
import { ViolationDateRangePicker } from "@/components/violations/ViolationDateRangePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/services/adminApi";
import { reportsApi, unwrapAgencyDashboard } from "@/services/reportsApi";
import type { AgencyDashboardPayload } from "@/types/agencyReports";
import {
  vnCurrentFullMonthRangeYmd,
  vnCurrentQuarterRangeYmd,
  vnRolling7DaysRangeYmd,
} from "@/lib/vnDateRange";
import { cn } from "@/lib/utils";

const ChartsLazy = lazy(async () => {
  const m = await import("@/components/agency/reports/AgencyReportCharts");
  return { default: m.AgencyReportCharts };
});

function finiteOr(n: unknown, fallback: number): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function violationCountByType(
  rows: AgencyDashboardPayload["summary"]["violationsByType"],
  t: string,
): number {
  const hit = rows.find((r) => r.type === t);
  return finiteOr(hit?.count, 0);
}

async function messageFromErrorBlob(blob: Blob): Promise<string> {
  try {
    const text = await blob.text();
    const j = JSON.parse(text) as { message?: unknown };
    if (j && typeof j.message === "string" && j.message.trim()) return j.message.trim();
  } catch {
    /* ignore */
  }
  return "Không xuất được báo cáo.";
}

function parseAttachmentFilename(cd: string | undefined): string | null {
  if (!cd) return null;
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) return quoted[1].trim();
  return null;
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
        "rounded-2xl border border-gray-200 bg-white p-4 text-gray-800 shadow-md",
        "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
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

export default function AgencyDashboardPage() {
  const defaultRange = useMemo(() => vnCurrentFullMonthRangeYmd(), []);

  const [draftFrom, setDraftFrom] = useState(defaultRange.from);
  const [draftTo, setDraftTo] = useState(defaultRange.to);
  const [draftDriverId, setDraftDriverId] = useState("");
  const [draftViolationType, setDraftViolationType] = useState<"" | "DROWSY" | "DISTRACTED">("");

  const [appliedFrom, setAppliedFrom] = useState(defaultRange.from);
  const [appliedTo, setAppliedTo] = useState(defaultRange.to);
  const [appliedDriverId, setAppliedDriverId] = useState("");
  const [appliedViolationType, setAppliedViolationType] = useState<"" | "DROWSY" | "DISTRACTED">("");

  const [dashboard, setDashboard] = useState<AgencyDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [driverRoleId, setDriverRoleId] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getDashboard({
        startDate: appliedFrom,
        endDate: appliedTo,
        ...(appliedDriverId ? { driverId: appliedDriverId } : {}),
        ...(appliedViolationType ? { violationType: appliedViolationType } : {}),
      });
      const parsed = unwrapAgencyDashboard(res);
      if (!parsed) {
        const msg = (res.data as { message?: string } | undefined)?.message;
        toast.error(typeof msg === "string" && msg.trim() ? msg.trim() : "Không tải được thống kê.");
        setDashboard(null);
        return;
      }
      setDashboard(parsed);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const body = e.response?.data as { message?: string } | undefined;
        const msg = typeof body?.message === "string" ? body.message.trim() : "";
        toast.error(msg || "Không tải được thống kê.");
      } else {
        toast.error("Không tải được thống kê.");
      }
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo, appliedDriverId, appliedViolationType]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getRoles();
        const list = res.data?.data as { id: string; name: string }[] | undefined;
        const d = Array.isArray(list) ? list.find((r) => r.name === "DRIVER") : undefined;
        if (d) setDriverRoleId(d.id);
      } catch {
        setDriverRoleId("");
      }
    })();
  }, []);

  useEffect(() => {
    if (!driverRoleId) return;
    (async () => {
      setDriversLoading(true);
      try {
        const res = await adminApi.getList({ page: 1, limit: 500, role_id: driverRoleId });
        const payload = res.data?.data as { data?: { id: string; full_name: string }[] } | undefined;
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setDrivers(data.map((u) => ({ id: u.id, full_name: u.full_name })));
      } catch {
        setDrivers([]);
      } finally {
        setDriversLoading(false);
      }
    })();
  }, [driverRoleId]);

  const onRangeDraftChange = useCallback((r: { from: string; to: string }) => {
    setDraftFrom(r.from);
    setDraftTo(r.to);
  }, []);

  const onApplyFilters = useCallback(() => {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedDriverId(draftDriverId);
    setAppliedViolationType(draftViolationType);
  }, [draftFrom, draftTo, draftDriverId, draftViolationType]);

  const summary = dashboard?.summary;

  const canExport =
    !loading &&
    summary != null &&
    (finiteOr(summary.totalCompletedTrips, 0) > 0 || finiteOr(summary.totalViolations, 0) > 0);

  const emptyDashboard = !loading && summary != null && !canExport;

  const drowsy = summary ? violationCountByType(summary.violationsByType, "DROWSY") : 0;
  const distracted = summary ? violationCountByType(summary.violationsByType, "DISTRACTED") : 0;
  const trips = summary ? finiteOr(summary.totalCompletedTrips, 0) : 0;
  const totalV = summary ? finiteOr(summary.totalViolations, 0) : 0;
  const avgScore = summary?.averageSafetyScoreMonthOfEnd;

  const scoreMonthLabel = useMemo(() => {
    const ym = dashboard?.summary?.evaluationMonthForScore;
    if (!ym) return "";
    const [y, m] = ym.split("-");
    return y && m ? `Tháng ${Number(m)}/${y}` : ym;
  }, [dashboard?.summary?.evaluationMonthForScore]);

  const handleExportExcel = useCallback(async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const res = await reportsApi.exportExcel({
        startDate: appliedFrom,
        endDate: appliedTo,
        ...(appliedDriverId ? { driverId: appliedDriverId } : {}),
        ...(appliedViolationType ? { violationType: appliedViolationType } : {}),
      });
      const blob = res.data as Blob;
      const ct = String(res.headers["content-type"] ?? "").toLowerCase();
      if (!ct.includes("spreadsheetml")) {
        toast.warning(await messageFromErrorBlob(blob));
        return;
      }
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download =
          parseAttachmentFilename(res.headers["content-disposition"] as string | undefined) ??
          `bao-cao-nha-xe_${appliedFrom}_${appliedTo}.xlsx`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Đã tải file Excel.");
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
        toast.warning(await messageFromErrorBlob(e.response.data));
        return;
      }
      toast.error("Không xuất được báo cáo.");
    } finally {
      setExporting(false);
    }
  }, [canExport, appliedFrom, appliedTo, appliedDriverId, appliedViolationType]);

  return (
    <div className="mx-auto w-full max-w-[1320px] min-w-0 space-y-6 text-foreground">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-black tracking-tight min-[1024px]:text-3xl">Thống kê và xuất báo cáo</h1>
        <p className="text-sm text-muted-foreground">
          Dữ liệu theo khoảng ngày (VN), lọc theo tài xế và loại vi phạm nếu cần. Xuất Excel dùng cùng bộ tham số với thống kê.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm min-[1024px]:flex-row min-[1024px]:flex-wrap min-[1024px]:items-end min-[1024px]:justify-between">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs">Khoảng thời gian</Label>
            <ViolationDateRangePicker from={draftFrom} to={draftTo} onRangeChange={onRangeDraftChange} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const r = vnRolling7DaysRangeYmd();
                  setDraftFrom(r.from);
                  setDraftTo(r.to);
                }}
              >
                7 ngày
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const r = vnCurrentFullMonthRangeYmd();
                  setDraftFrom(r.from);
                  setDraftTo(r.to);
                }}
              >
                Tháng này
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const r = vnCurrentQuarterRangeYmd();
                  setDraftFrom(r.from);
                  setDraftTo(r.to);
                }}
              >
                Quý này
              </Button>
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="text-xs">Tài xế</Label>
            <Select
              value={draftDriverId || "__all__"}
              onValueChange={(v) => setDraftDriverId(v === "__all__" ? "" : v)}
              disabled={driversLoading}
            >
              <SelectTrigger className="h-10 w-full min-w-0">
                <SelectValue placeholder={driversLoading ? "Đang tải…" : "Tất cả"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="text-xs">Loại vi phạm AI</Label>
            <Select
              value={draftViolationType || "__all__"}
              onValueChange={(v) =>
                setDraftViolationType(v === "__all__" ? "" : (v as "DROWSY" | "DISTRACTED"))
              }
            >
              <SelectTrigger className="h-10 w-full min-w-0">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                <SelectItem value="DROWSY">Buồn ngủ</SelectItem>
                <SelectItem value="DISTRACTED">Mất tập trung</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" className="gap-2" onClick={onApplyFilters} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Filter className="size-4" aria-hidden />}
            Lọc
          </Button>
          <div className="mx-1 hidden h-8 w-px bg-border min-[1024px]:block" aria-hidden />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="w-full text-[11px] font-bold uppercase tracking-wide text-muted-foreground min-[1024px]:sr-only">
              Xuất báo cáo
            </span>
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleExportExcel()}
              disabled={!canExport || exporting}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="size-4" aria-hidden />
              )}
              Excel
            </Button>
            <Button type="button" variant="outline" className="gap-2" disabled title="Backend chưa hỗ trợ xuất PDF.">
              <FileText className="size-4 opacity-50" aria-hidden />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {emptyDashboard ? (
        <p className="text-sm text-muted-foreground">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/70" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-[300px] animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-[300px] animate-pulse rounded-2xl bg-muted/60" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard title="Tổng chuyến hoàn thành" value={trips} />
            <StatCard title="Tổng vi phạm" value={totalV} />
            <StatCard title="Vi phạm buồn ngủ" value={drowsy} />
            <StatCard title="Vi phạm mất tập trung" value={distracted} />
            <StatCard
              title="Điểm an toàn trung bình"
              value={avgScore == null || !Number.isFinite(avgScore) ? "—" : avgScore.toFixed(2)}
              hint={
                scoreMonthLabel
                  ? `Theo bảng điểm ${scoreMonthLabel} (tháng chứa ngày kết thúc lọc).`
                  : undefined
              }
            />
          </div>

          {dashboard ? (
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="h-[300px] animate-pulse rounded-2xl bg-muted/60" />
                  <div className="h-[300px] animate-pulse rounded-2xl bg-muted/60" />
                </div>
              }
            >
              <ChartsLazy
                charts={dashboard.charts}
                violationsByType={dashboard.summary.violationsByType}
                totalViolations={totalV}
              />
            </Suspense>
          ) : null}
        </>
      )}
    </div>
  );
}
