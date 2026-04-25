import { ClipboardCheck } from "lucide-react";

export function DriverViolationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-gradient-to-b from-slate-50 to-white px-6 py-16 text-center dark:border-slate-600 dark:from-slate-900/40 dark:to-[#1e293b]">
      <div className="mb-5 flex size-24 items-center justify-center rounded-full bg-blue-600/10 ring-2 ring-blue-600/15 dark:bg-blue-400/10 dark:ring-blue-400/20">
        <ClipboardCheck className="size-12 text-blue-600 dark:text-blue-400" strokeWidth={1.25} aria-hidden />
      </div>
      <h2 className="text-lg font-black tracking-tight text-foreground">Không có vi phạm trong khoảng thời gian này</h2>
      <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        Bạn an toàn trên đường — hoặc thử đổi tháng / bỏ lọc mã chuyến để xem thêm dữ liệu.
      </p>
    </div>
  );
}
