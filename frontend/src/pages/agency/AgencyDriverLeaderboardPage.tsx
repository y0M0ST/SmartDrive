/**
 * US_13 — Bảng xếp hạng điểm an toàn (Agency).
 *
 * PHẦN 1 — Backend (không mock):
 * - `GET /api/scores/leaderboard` → `{ evaluation_month, sort, entries[] }` với `final_score`, `total_violations`,
 *   `total_deducted_points` (null nếu chưa có driver_scores tháng), `driver_id`, `full_name`.
 * - Query: `month` (YYYY-MM, optional → BE dùng tháng hiện tại VN), `sort`: `asc` | `desc` (optional, default `desc`).
 *   **Sắp xếp trên server** — `desc` = điểm cao trước (an toàn hơn), `asc` = điểm thấp trước (cần chú ý).
 * - Drill-down: `GET /api/scores/driver/:driverId/history?month=YYYY-MM` (bắt buộc month) → `violations[]`
 *   (`id`, `type`, `occurred_at`, `image_url`, `points_deducted`, `trip_id`).
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";
import { vnCurrentYearMonth, vnYearMonthOptions } from "@/lib/vnDateRange";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { driverScoresApi, unwrapLeaderboard } from "@/services/driverScoresApi";
import type { LeaderboardEntry } from "@/types/driverScores";
import { ScoreBarCell } from "@/components/agency/driver-leaderboard/ScoreBarCell";
import { DriverViolationHistoryModal } from "@/components/agency/driver-leaderboard/DriverViolationHistoryModal";
import { cn } from "@/lib/utils";

const MONTH_OPTIONS = vnYearMonthOptions(18);

function ymDisplayLabel(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `Tháng ${Number(m)}/${y}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function displayNullableInt(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

export default function AgencyDriverLeaderboardPage() {
  const [month, setMonth] = useState(() => vnCurrentYearMonth());
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driverScoresApi.getLeaderboard({ month, sort });
      const parsed = unwrapLeaderboard(res);
      if (!parsed) {
        setEntries([]);
        toast.error("Không đọc được dữ liệu bảng xếp hạng.");
        return;
      }
      setEntries(parsed.entries);
    } catch (e: unknown) {
      setEntries([]);
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "")
          : "";
      toast.error(msg || "Không tải được bảng xếp hạng.");
    } finally {
      setLoading(false);
    }
  }, [month, sort]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const tabValue = sort === "desc" ? "safest" : "attention";

  const onTabChange = (v: string) => {
    setSort(v === "safest" ? "desc" : "asc");
  };

  const openDetail = useCallback((row: LeaderboardEntry) => {
    setSelected({ id: row.driver_id, name: row.full_name });
    setModalOpen(true);
  }, []);

  const emptyLeaderboard = !loading && entries.length === 0;

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight md:text-3xl">
          <Trophy className="size-8 shrink-0 text-amber-500" aria-hidden />
          Bảng xếp hạng tài xế
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Điểm an toàn theo tháng (phạm vi nhà xe). Dữ liệu lấy trực tiếp từ máy chủ — không dùng mock.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-end md:justify-between md:p-5">
        <div className="min-w-0 flex-1 space-y-2 md:max-w-xs">
          <Label htmlFor="lb-month" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Tháng đánh giá
          </Label>
          <Select value={month} onValueChange={setMonth} disabled={loading}>
            <SelectTrigger id="lb-month" className="h-11 w-full rounded-xl font-semibold">
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

        <Tabs value={tabValue} onValueChange={onTabChange} className="w-full md:w-auto md:min-w-[320px]">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 md:w-full">
            <TabsTrigger value="safest" className="rounded-lg px-3 py-2.5 text-xs font-bold sm:text-sm">
              An toàn nhất
            </TabsTrigger>
            <TabsTrigger value="attention" className="rounded-lg px-3 py-2.5 text-xs font-bold sm:text-sm">
              Cần chú ý
            </TabsTrigger>
          </TabsList>
          <TabsContent value="safest" className="mt-0 hidden" />
          <TabsContent value="attention" className="mt-0 hidden" />
        </Tabs>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-muted-foreground">
          <Loader2 className="size-9 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
          <p className="text-sm font-medium">Đang tải bảng xếp hạng…</p>
        </div>
      ) : emptyLeaderboard ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu — không có tài xế DRIVER trong nhà xe hoặc phản hồi rỗng từ máy chủ.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center font-bold">#</TableHead>
                <TableHead className="min-w-[160px] font-bold">Tài xế</TableHead>
                <TableHead className="text-center font-bold">Vi phạm</TableHead>
                <TableHead className="text-center font-bold">Điểm trừ</TableHead>
                <TableHead className="min-w-[200px] font-bold">Điểm an toàn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((row, idx) => (
                <TableRow
                  key={row.driver_id}
                  className={cn("cursor-pointer transition-colors hover:bg-muted/50")}
                  onClick={() => openDetail(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetail(row);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Xem chi tiết vi phạm tháng của ${row.full_name}`}
                >
                  <TableCell className="text-center text-sm font-black tabular-nums text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600/15 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                        aria-hidden
                      >
                        {initials(row.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{row.full_name}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground" title={row.driver_id}>
                          ID: {row.driver_id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm font-semibold tabular-nums">
                    {displayNullableInt(row.total_violations)}
                  </TableCell>
                  <TableCell className="text-center text-sm font-semibold tabular-nums">
                    {displayNullableInt(row.total_deducted_points)}
                  </TableCell>
                  <TableCell>
                    <ScoreBarCell finalScore={row.final_score} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DriverViolationHistoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        driverId={selected?.id ?? null}
        driverName={selected?.name ?? ""}
        month={month}
      />
    </div>
  );
}
