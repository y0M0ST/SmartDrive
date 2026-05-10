import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { ImageOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { driverScoresApi, unwrapDriverHistory } from "@/services/driverScoresApi";
import type { DriverViolationHistoryItem } from "@/types/driverScores";
import { VN_IANA } from "@/lib/vnDateRange";
import { cn } from "@/lib/utils";

function violationTypeLabel(type: string): string {
  switch (type) {
    case "DROWSY":
      return "Buồn ngủ";
    case "DISTRACTED":
      return "Mất tập trung";
    default:
      return type || "—";
  }
}

function formatOccurred(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return formatInTimeZone(d, VN_IANA, "dd/MM/yyyy HH:mm");
  } catch {
    return iso;
  }
}

type ThumbProps = { src: string; alt: string };

function ViolationThumb({ src, alt }: ThumbProps) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
        <ImageOff className="size-5 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="size-12 shrink-0 rounded-lg border border-border object-cover"
      onError={() => setErr(true)}
    />
  );
}

type DriverViolationHistoryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string | null;
  driverName: string;
  month: string;
};

export function DriverViolationHistoryModal({
  open,
  onOpenChange,
  driverId,
  driverName,
  month,
}: DriverViolationHistoryModalProps) {
  const [rows, setRows] = useState<DriverViolationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!driverId || !month.trim()) return;
    setLoading(true);
    try {
      const res = await driverScoresApi.getDriverViolationHistory(driverId, month);
      const parsed = unwrapDriverHistory(res);
      setRows(parsed?.violations ?? []);
    } catch {
      setRows([]);
      toast.error("Không tải được lịch sử vi phạm của tài xế.");
    } finally {
      setLoading(false);
    }
  }, [driverId, month]);

  useEffect(() => {
    if (!open || !driverId) {
      setRows([]);
      return;
    }
    void load();
  }, [open, driverId, month, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90dvh,720px)] w-[min(100vw-1.5rem,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b border-border px-4 py-3 text-left sm:px-5">
          <DialogTitle className="text-base leading-snug sm:text-lg">
            Chi tiết vi phạm trong tháng
            <span className="mt-1 block text-sm font-semibold text-muted-foreground">
              {driverName} · {month}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(70dvh,560px)] overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" aria-hidden />
              <p className="text-sm font-medium">Đang tải…</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu vi phạm trong tháng này.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[52px]">Ảnh</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Điểm trừ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="align-middle">
                      <ViolationThumb src={r.image_url} alt="" />
                    </TableCell>
                    <TableCell className="max-w-[120px] align-middle text-xs font-medium whitespace-normal break-words sm:max-w-none sm:text-sm">
                      {formatOccurred(r.occurred_at)}
                    </TableCell>
                    <TableCell className="align-middle text-xs sm:text-sm">{violationTypeLabel(r.type)}</TableCell>
                    <TableCell className="align-middle text-right text-sm font-bold tabular-nums">
                      {Number.isFinite(r.points_deducted) ? `−${r.points_deducted}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
