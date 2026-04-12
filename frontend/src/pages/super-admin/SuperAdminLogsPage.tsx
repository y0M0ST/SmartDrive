import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

type LogRow = { time: string; level: "info" | "warn" | "error"; msg: string };

/**
 * Phác thảo: audit SA + log lỗi hệ thống (500, DB, AI...). Nối ELK / file log sau.
 */
export default function SuperAdminLogsPage() {
  const rows: LogRow[] = [
    {
      time: "2026-04-11 09:12:01",
      level: "info",
      msg: "[SA] Đã tạo tài khoản quản lý nhà xe cho đại lý AGENCY_04 (demo)",
    },
    {
      time: "2026-04-11 08:55:22",
      level: "warn",
      msg: "Nhận diện khuôn mặt: độ trễ cao — kiểm tra hàng đợi xử lý (demo)",
    },
    {
      time: "2026-04-11 08:40:00",
      level: "error",
      msg: "HTTP 500 — tạo chuyến: lỗi kết nối cơ sở dữ liệu (demo)",
    },
    {
      time: "2026-04-11 08:12:33",
      level: "error",
      msg: "Dịch vụ AI face check không phản hồi — circuit breaker mở (demo)",
    },
    {
      time: "2026-04-10 22:01:00",
      level: "info",
      msg: "[SA] Cập nhật gói Pro cho AGENCY_02 (demo)",
    },
  ];

  const badge = (l: LogRow["level"]) => {
    if (l === "error")
      return (
        <Badge className="bg-red-100 font-bold text-red-800 dark:bg-red-900/40 dark:text-red-200">
          ERROR
        </Badge>
      );
    if (l === "warn")
      return (
        <Badge className="bg-amber-100 font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          WARN
        </Badge>
      );
    return (
      <Badge className="bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        INFO
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
          Nhật ký hệ thống
        </h1>
        <p className="mt-1 max-w-3xl text-slate-500 dark:text-slate-400">
          Gộp audit hành động Super Admin và log kỹ thuật (server, DB, AI). Hiện là{" "}
          <strong>dữ liệu tĩnh</strong> minh họa.
        </p>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black">
            <Icons.ScrollText className="size-5" />
            Luồng log (demo)
          </CardTitle>
          <CardDescription>Mới nhất trên cùng.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="shrink-0 font-mono text-xs text-slate-400">{r.time}</span>
              <div className="shrink-0">{badge(r.level)}</div>
              <p className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{r.msg}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
