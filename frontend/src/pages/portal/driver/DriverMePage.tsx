import { readStoredUserFullName } from "@/lib/adminAccess";

export default function DriverMePage() {
  const name = readStoredUserFullName() || "Tài xế";

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-3xl md:font-black md:tracking-tight">Cá nhân</h1>
        <p className="mt-1 hidden text-muted-foreground md:block">Thông tin tài khoản tài xế trên Safe Drive.</p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Họ tên</p>
        <p className="mt-2 text-2xl font-black text-foreground">{name}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Trang hồ sơ chi tiết sẽ được bổ sung trong các phiên bản tiếp theo.
        </p>
      </div>
    </div>
  );
}
