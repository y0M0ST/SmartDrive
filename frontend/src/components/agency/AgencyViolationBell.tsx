import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgencySocket } from "@/contexts/AgencySocketContext";
import { isSuperAdmin, readStoredUserRole } from "@/lib/adminAccess";
import { VN_IANA } from "@/lib/vnDateRange";
import { cn } from "@/lib/utils";

function violationTypeVi(t: string): string {
  if (t === "DROWSY") return "Buồn ngủ";
  if (t === "DISTRACTED") return "Mất tập trung";
  return t;
}

function formatOccurredAt(iso: string): string {
  try {
    return formatInTimeZone(new Date(iso), VN_IANA, "dd/MM/yyyy HH:mm");
  } catch {
    return iso;
  }
}

export function AgencyViolationBell() {
  const role = readStoredUserRole();
  const {
    agencySocketEnabled,
    unreadCount,
    unreadItems,
    unreadLoading,
    acknowledgeViolation,
  } = useAgencySocket();
  const [open, setOpen] = useState(false);
  const [ackingId, setAckingId] = useState<string | null>(null);

  if (isSuperAdmin(role) || !agencySocketEnabled) {
    return null;
  }

  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Vi phạm AI chưa đọc"
        >
          <Bell size={20} aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-card">
              {badge}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-2rem),22rem)] max-h-[min(70vh,26rem)] overflow-y-auto p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-extrabold text-foreground">Vi phạm chưa đọc</p>
          <p className="text-[10px] text-muted-foreground">Realtime qua Socket.io · US_10</p>
        </div>
        <div className="p-2">
          {unreadLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span className="text-xs font-medium">Đang tải…</span>
            </div>
          ) : unreadItems.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Không có vi phạm chưa đọc.</p>
          ) : (
            <ul className="space-y-2">
              {unreadItems.map((row) => (
                <li
                  key={row.id}
                  className="flex gap-2 rounded-xl border border-border bg-card p-2 text-card-foreground"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={row.image_url}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-[11px] font-bold text-foreground">
                      {row.trip_code ?? "—"} · {violationTypeVi(row.type)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatOccurredAt(row.occurred_at)}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={cn("h-7 w-full text-[11px] font-bold")}
                      disabled={ackingId === row.id}
                      onClick={async () => {
                        setAckingId(row.id);
                        try {
                          await acknowledgeViolation(row.id);
                        } catch {
                          toast.error("Không đánh dấu được đã xem.");
                        } finally {
                          setAckingId(null);
                        }
                      }}
                    >
                      {ackingId === row.id ? "Đang xử lý…" : "Đã xem"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
