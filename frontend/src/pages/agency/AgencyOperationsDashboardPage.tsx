import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Radio,
  RefreshCw,
  Route,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tripTrackingApi, unwrapActiveTracking } from "@/services/tripTrackingApi";
import { violationsInboxApi, unwrapViolationsUnread } from "@/services/violationsInboxApi";
import type { ActiveTripTrackingRow } from "@/types/tripTracking";
import type { ViolationUnreadItem } from "@/types/violationsInbox";

const REFRESH_MS = 30_000;
const STALE_SIGNAL_MS = 2 * 60 * 1000;

function toLocalTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStaleSignal(iso: string | null | undefined): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > STALE_SIGNAL_MS;
}

function violationTypeVi(t: string): string {
  if (t === "DROWSY") return "Buồn ngủ";
  if (t === "DISTRACTED") return "Mất tập trung";
  return t;
}

function relativeSecondsLabel(lastMs: number | null): string {
  if (!lastMs) return "chưa cập nhật";
  const sec = Math.max(0, Math.floor((Date.now() - lastMs) / 1000));
  return `${sec} giây trước`;
}

export default function AgencyOperationsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrips, setActiveTrips] = useState<ActiveTripTrackingRow[]>([]);
  const [unreadItems, setUnreadItems] = useState<ViolationUnreadItem[]>([]);
  const [lastRefreshMs, setLastRefreshMs] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [driverFilter, setDriverFilter] = useState("__all__");
  const [typeFilter, setTypeFilter] = useState<"__all__" | "DROWSY" | "DISTRACTED">("__all__");

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [activeRes, unreadRes] = await Promise.all([
        tripTrackingApi.getActiveTracking(),
        violationsInboxApi.getUnread(8),
      ]);

      const trips = unwrapActiveTracking(activeRes);
      const unread = unwrapViolationsUnread(unreadRes);
      setActiveTrips(trips);
      setUnreadItems(unread?.items ?? []);
      setLastRefreshMs(Date.now());
    } catch {
      toast.error("Không tải được dữ liệu vận hành dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchData(true), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => setRefreshTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  void refreshTick;

  const driverOptions = useMemo(() => {
    const names = Array.from(new Set(activeTrips.map((t) => (t.driver_name || "").trim()).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b, "vi"));
  }, [activeTrips]);

  const filteredTrips = useMemo(() => {
    return activeTrips.filter((t) => {
      if (driverFilter !== "__all__" && (t.driver_name || "") !== driverFilter) return false;
      return true;
    });
  }, [activeTrips, driverFilter]);

  const filteredUnreadItems = useMemo(() => {
    return unreadItems.filter((v) => {
      if (driverFilter !== "__all__" && (v.driver_name || "") !== driverFilter) return false;
      if (typeFilter !== "__all__" && v.type !== typeFilter) return false;
      return true;
    });
  }, [unreadItems, driverFilter, typeFilter]);

  const stats = useMemo(() => {
    const staleSignals = filteredTrips.filter((t) => isStaleSignal(t.last_signal_time)).length;
    const withGps = filteredTrips.filter((t) => t.latitude != null && t.longitude != null).length;
    const speeds = filteredTrips.map((t) => Number(t.speed ?? 0)).filter((s) => Number.isFinite(s) && s > 0);
    const avgSpeed = speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;
    return {
      activeTrips: filteredTrips.length,
      withGps,
      staleSignals,
      unreadCount: filteredUnreadItems.length,
      avgSpeed,
    };
  }, [filteredTrips, filteredUnreadItems.length]);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dashboard nhà xe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Màn hình điều hành realtime: chuyến đang chạy, tín hiệu GPS và cảnh báo AI chưa xử lý.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cập nhật lần cuối: <span className="font-semibold text-foreground">{relativeSecondsLabel(lastRefreshMs)}</span>
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void fetchData(true)} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bộ lọc nhanh dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Tài xế</Label>
            <Select value={driverFilter} onValueChange={(v) => setDriverFilter(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tất cả tài xế" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả tài xế</SelectItem>
                {driverOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Loại vi phạm</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as "__all__" | "DROWSY" | "DISTRACTED")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả loại</SelectItem>
                <SelectItem value="DROWSY">Buồn ngủ</SelectItem>
                <SelectItem value="DISTRACTED">Mất tập trung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="h-9 w-full sm:w-auto"
              onClick={() => {
                setDriverFilter("__all__");
                setTypeFilter("__all__");
              }}
            >
              Xóa lọc nhanh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Chuyến đang chạy</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black">{loading ? "…" : stats.activeTrips}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Có tín hiệu GPS</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? "…" : stats.withGps}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Mất tín hiệu &gt; 2 phút</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {loading ? "…" : stats.staleSignals}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vi phạm chưa đọc</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black text-red-600 dark:text-red-400">
            {loading ? "…" : stats.unreadCount}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tốc độ trung bình</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black">{loading ? "…" : `${stats.avgSpeed} km/h`}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Route className="size-5" />
              Chuyến đang vận hành
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTrips.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hiện không có chuyến `IN_PROGRESS`.</p>
            ) : (
              filteredTrips.slice(0, 8).map((t) => {
                const stale = isStaleSignal(t.last_signal_time);
                return (
                  <div
                    key={t.trip_id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="font-bold">{t.trip_code} · {t.license_plate || "—"}</p>
                      <p className="text-xs text-muted-foreground">{t.driver_name || "Chưa có tài xế"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        GPS: {toLocalTime(t.last_signal_time)} · Speed: {Math.round(Number(t.speed ?? 0))} km/h
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={stale ? "destructive" : "secondary"}>
                        {stale ? "Mất tín hiệu" : "Đang theo dõi"}
                      </Badge>
                      <Badge variant="outline">{t.violation_count} vi phạm</Badge>
                    </div>
                  </div>
                );
              })
            )}
            <div className="pt-2">
              <Link to="/admin/fleet" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Mở bản đồ giám sát
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5 text-orange-600" />
              Ưu tiên xử lý
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredUnreadItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có vi phạm chưa đọc.</p>
            ) : (
              filteredUnreadItems.slice(0, 6).map((v) => (
                <div key={v.id} className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="font-semibold">
                    {v.trip_code || "Không có mã chuyến"} · {violationTypeVi(v.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {toLocalTime(v.occurred_at)} {v.driver_name ? `· ${v.driver_name}` : ""}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    <span>
                      {v.latitude != null && v.longitude != null
                        ? `${v.latitude.toFixed(5)}, ${v.longitude.toFixed(5)}`
                        : "Không có tọa độ"}
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="space-y-2 pt-2">
              <Link to="/admin/violations" className="block">
                <Button variant="secondary" className="w-full justify-between">
                  Xử lý vi phạm
                  <TriangleAlert className="size-4" />
                </Button>
              </Link>
              <Link to="/admin/finance" className="block">
                <Button variant="outline" className="w-full justify-between">
                  Xem báo cáo chi tiết
                  <Activity className="size-4" />
                </Button>
              </Link>
              <Link to="/admin/trips" className="block">
                <Button variant="outline" className="w-full justify-between">
                  Điều phối chuyến
                  <Radio className="size-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

