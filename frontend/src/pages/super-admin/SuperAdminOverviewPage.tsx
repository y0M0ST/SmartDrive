import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

/**
 * Phác thảo US: tổng agency hoạt động, chỉ số hệ thống, API call, cảnh báo vi phạm theo agency.
 * Dữ liệu demo — nối Prometheus / audit log sau.
 */
export default function SuperAdminOverviewPage() {
  return (
    <div className="space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Tổng quan hệ thống</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Super Admin theo dõi sức khỏe nền tảng và đại lý. Số liệu bên dưới là{" "}
          <strong>demo</strong> cho báo cáo / luận văn; sau này nối metric thật &amp; DB.
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
            <p className="text-3xl font-black text-card-foreground">10</p>
            <p className="text-xs text-muted-foreground">Demo — số liệu minh họa</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Icons.Cpu className="size-4" />
              CPU (node)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">24%</p>
            <p className="text-xs text-muted-foreground">Demo</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Icons.MemoryStick className="size-4" />
              RAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">61%</p>
            <p className="text-xs text-muted-foreground">Demo</p>
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
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">128</p>
            <p className="text-xs text-muted-foreground">Session / WS — demo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black">Tần suất truy cập (demo)</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Biểu đồ minh họa — sau này có thể nối số liệu giám sát thật từ hạ tầng.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-2 rounded-2xl bg-muted px-4 py-6">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                <div
                  key={i}
                  className="w-full max-w-[8%] rounded-t-md bg-blue-500/80"
                  style={{ height: `${h}%` }}
                  title={`${h}%`}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">12h gần nhất (mock)</p>
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
              Các nhà xe có số vi phạm cao — nên gửi cảnh báo cho quản lý nhà xe và theo dõi xử lý.
            </p>
          </CardHeader>
          <CardContent className="relative space-y-3 pl-5">
            {[
              { name: "AGENCY_03 (demo)", count: 42, level: "cao" as const },
              { name: "AGENCY_07 (demo)", count: 28, level: "trung bình" as const },
              { name: "AGENCY_01 (demo)", count: 9, level: "thấp" as const },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between rounded-2xl border-2 border-orange-300/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-orange-800/70 dark:bg-card/80"
              >
                <span className="font-bold text-foreground">{row.name}</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-orange-600/50 bg-orange-100 font-black text-orange-950 dark:border-orange-400/60 dark:bg-orange-950/60 dark:text-orange-100"
                  >
                    {row.count} vụ
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
