import { useState } from "react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiViolationAlertPayload } from "@/types/violationsInbox";
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

function mapsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function ViolationSocketToastCard({
  payload,
  toastId,
  onConfirm,
}: {
  payload: AiViolationAlertPayload;
  toastId: string | number;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div
      className={cn(
        "flex w-[min(calc(100vw-2rem),380px)] gap-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg",
      )}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        <img
          src={payload.image_url}
          alt=""
          className="size-full object-cover"
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-0.5">
          <p className="truncate text-xs font-extrabold text-foreground">
            {payload.license_plate || "—"}{" "}
            <span className="font-semibold text-muted-foreground">·</span>{" "}
            {payload.driver_name || "—"}
          </p>
          <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
            {violationTypeVi(payload.violation_type)}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatOccurredAt(payload.occurred_at)}</p>
          {payload.latitude != null &&
          payload.longitude != null &&
          Number.isFinite(payload.latitude) &&
          Number.isFinite(payload.longitude) ? (
            <p className="text-[10px] text-muted-foreground">
              GPS:{" "}
              <span className="font-mono text-foreground">
                {payload.latitude.toFixed(5)}, {payload.longitude.toFixed(5)}
              </span>{" "}
              <a
                href={mapsHref(payload.latitude, payload.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-0.5 font-semibold text-primary underline-offset-2 hover:underline"
              >
                Bản đồ
                <ExternalLink className="size-3 shrink-0" aria-hidden />
              </a>
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 w-full text-xs font-bold"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              toast.dismiss(toastId);
            } catch {
              toast.error("Không đánh dấu đã xem được.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Đang xử lý…" : "Đã xem"}
        </Button>
      </div>
    </div>
  );
}
