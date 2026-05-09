import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import { platformOverviewApi, type SuperPlatformOverview } from "@/services/platformOverviewApi";

/**
 * Super Admin — tổng quan nền tảng: dữ liệu từ DB + Node.js (API GET /api/platform/overview).
 */
export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<SuperPlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const overview = await platformOverviewApi.getOverview();
        if (!cancelled) setData(overview);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không tải được tổng quan.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartMax = useMemo(() => {
    if (!data?.access_chart?.length) return 1;
    return Math.max(1, ...data.access_chart.map((p) => p.count));
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Icons.Loader2 className="mr-2 size-6 animate-spin" />
        Đang tải số liệu tổng quan…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
        <p className="font-bold">Không tải được tổng quan</p>
        <p className="mt-1 text-sm">{error ?? "Lỗi không xác định."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Tổng quan hệ thống</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Super Admin theo dõi sức khỏe nền tảng và đại lý. Số liệu lấy trực tiếp từ cơ sở dữ liệu và tiến trình
          máy chủ Node.js (phiên đăng nhập, vi phạm AI theo nhà xe, tải RAM/CPU ước lượng).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Icons.Building2 className="size-4" />
              Đại lý hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-card-foreground">{data.active_agencies}</p>
            <p className="text-xs text-muted-foreground">Nhà xe trạng thái ACTIVE trong hệ thống</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Icons.Cpu className="size-4" />
              CPU (tiến trình Node)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {data.node_cpu_process_percent}%
            </p>
            <p className="text-xs text-muted-foreground">Ước lượng % CPU của process so với số lõi</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Icons.MemoryStick className="size-4" />
              RAM máy chủ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {data.system_ram_percent}%
            </p>
            <p className="text-xs text-muted-foreground">
              Bộ nhớ hệ điều hành đang dùng · Heap Node: {data.node_heap_percent}%
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Icons.Users className="size-4" />
              Đang online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{data.active_sessions}</p>
            <p className="text-xs text-muted-foreground">
              Phiên đăng nhập còn hiệu lực · Socket (agency): {data.socket_connections}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black">Phiên đăng nhập theo giờ</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Số phiên mới được cấp (`user_sessions.issued_at`) trong 12 giờ gần nhất — phản ánh mức độ truy cập web
              admin / ứng dụng.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-2 rounded-2xl bg-muted px-4 py-6">
              {data.access_chart.map((p) => {
                const h = Math.round((p.count / chartMax) * 100);
                return (
                  <div
                    key={p.bucket_iso}
                    className="w-full max-w-[8%] rounded-t-md bg-blue-500/80"
                    style={{ height: `${Math.max(h, p.count > 0 ? 8 : 4)}%` }}
                    title={`${p.label}: ${p.count}`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Trục ngang: các khung giờ trong 12 giờ gần nhất (theo múi giờ máy chủ DB)
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border-2 border-orange-400/90 bg-gradient-to-br from-orange-50 via-amber-50 to-background shadow-md ring-2 ring-orange-300/50 dark:border-orange-500/60 dark:from-orange-950/50 dark:via-amber-950/40 dark:to-card dark:ring-orange-500/25">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-orange-500 to-amber-600 dark:from-orange-400 dark:to-amber-500"
            aria-hidden
          />
          <CardHeader className="relative pl-5">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-950 dark:border-orange-400/50 dark:bg-orange-400/15 dark:text-orange-100">
              <Icons.AlertTriangle className="size-3.5 shrink-0 text-orange-700 dark:text-orange-300" />
              Ưu tiên xử lý
            </div>
            <CardTitle className="mt-2 flex items-center gap-2 text-lg font-black tracking-tight text-orange-950 dark:text-orange-50">
              <Icons.ShieldAlert className="size-6 shrink-0 text-orange-700 dark:text-orange-300" />
              Cảnh báo vi phạm theo đại lý
            </CardTitle>
            <p className="text-sm font-medium leading-relaxed text-orange-950/90 dark:text-orange-100/90">
              Top nhà xe theo số vi phạm AI trong 30 ngày gần nhất — nên theo dõi và phối hợp xử lý.
            </p>
          </CardHeader>
          <CardContent className="relative space-y-3 pl-5">
            {data.violations_by_agency.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có vi phạm AI trong khoảng thời gian này.</p>
            ) : (
              data.violations_by_agency.map((row) => (
                <div
                  key={row.agency_id}
                  className="flex items-center justify-between rounded-2xl border-2 border-orange-300/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-orange-800/70 dark:bg-card/80"
                >
                  <span className="font-bold text-foreground">
                    {row.agency_code} — {row.agency_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-orange-600/50 bg-orange-100 font-black text-orange-950 dark:border-orange-400/60 dark:bg-orange-950/60 dark:text-orange-100"
                    >
                      {row.violation_count} vụ
                    </Badge>
                    <span
                      className={
                        row.level === "cao"
                          ? "text-xs font-bold uppercase text-red-700 dark:text-red-400"
                          : row.level === "trung bình"
                            ? "text-xs font-bold text-orange-800 dark:text-orange-200"
                            : "text-xs font-medium text-muted-foreground"
                      }
                    >
                      {row.level}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
