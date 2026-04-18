import { Bell } from "lucide-react";

export default function DriverNotificationsPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-3xl md:font-black md:tracking-tight">Thông báo</h1>
        <p className="mt-0.5 text-sm text-muted-foreground md:mt-1 md:text-base">
          Khu vực thông báo đang được xây dựng.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <Bell className="mb-4 size-12 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">Chưa có thông báo mới.</p>
      </div>
    </div>
  );
}
