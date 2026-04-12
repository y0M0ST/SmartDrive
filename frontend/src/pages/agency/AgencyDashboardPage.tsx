/**
 * Dashboard nhà xe (Agency Admin) — tách khỏi Super Admin.
 */
export default function AgencyDashboardPage() {
  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Dashboard nhà xe</h1>
        <p className="mt-1 text-muted-foreground">
          Tổng quan vận hành đại lý: tài xế, chuyến, xe — phát triển tiếp theo roadmap.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { t: "Tài xế hoạt động", v: "—", hint: "Số liệu sẽ cập nhật khi có báo cáo" },
          { t: "Chuyến hôm nay", v: "—", hint: "Số liệu sẽ cập nhật khi có báo cáo" },
          { t: "Xe sẵn sàng", v: "—", hint: "Số liệu sẽ cập nhật khi có báo cáo" },
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.t}</p>
            <p className="mt-2 text-3xl font-black">{c.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
