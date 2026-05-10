import { useState } from "react";
import { Bell, ExternalLink, Loader2, X } from "lucide-react";
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
import type { ViolationUnreadItem } from "@/types/violationsInbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [selected, setSelected] = useState<ViolationUnreadItem | null>(null);

  if (isSuperAdmin(role) || !agencySocketEnabled) {
    return null;
  }

  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  const mapsHref = (lat: number, lng: number): string =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

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
                  className="group flex gap-2 rounded-xl border border-border bg-card p-2 text-card-foreground"
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
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={cn("h-7 flex-1 text-[11px] font-bold")}
                        onClick={() => setSelected(row)}
                      >
                        Chi tiết
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-80 transition group-hover:opacity-100"
                        title="Đã xem và đóng"
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
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết vi phạm</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.trip_code ?? "—"} · ${violationTypeVi(selected.type)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border">
                <img
                  src={selected.image_url}
                  alt="Ảnh vi phạm"
                  className="max-h-[260px] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Loại:</span> {violationTypeVi(selected.type)}</p>
                <p><span className="font-semibold">Thời điểm:</span> {formatOccurredAt(selected.occurred_at)}</p>
                <p><span className="font-semibold">Tài xế:</span> {selected.driver_name ?? "—"}</p>
                <p><span className="font-semibold">Biển số:</span> {selected.license_plate ?? "—"}</p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Tọa độ:</span>{" "}
                  {selected.latitude != null && selected.longitude != null
                    ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
                    : "Không có tọa độ"}
                </p>
                {selected.latitude != null && selected.longitude != null ? (
                  <a
                    href={mapsHref(selected.latitude, selected.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Mở Google Maps
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
                <Button
                  disabled={ackingId === selected.id}
                  onClick={async () => {
                    setAckingId(selected.id);
                    try {
                      await acknowledgeViolation(selected.id);
                      setSelected(null);
                    } catch {
                      toast.error("Không đánh dấu được đã xem.");
                    } finally {
                      setAckingId(null);
                    }
                  }}
                >
                  {ackingId === selected.id ? "Đang xử lý…" : "Đã xem & đóng"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
