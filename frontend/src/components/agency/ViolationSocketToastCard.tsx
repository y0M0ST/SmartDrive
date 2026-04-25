import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiViolationAlertPayload } from "@/types/violationsInbox";
import { cn } from "@/lib/utils";

function violationTypeVi(t: string): string {
  if (t === "DROWSY") return "Buồn ngủ";
  if (t === "DISTRACTED") return "Mất tập trung";
  return t;
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
              toast.error("Không xác nhận được vi phạm.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Đang xử lý…" : "Xác nhận"}
        </Button>
      </div>
    </div>
  );
}
