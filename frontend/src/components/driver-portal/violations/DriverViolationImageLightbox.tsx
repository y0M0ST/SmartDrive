import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, X } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import type { DriverViolationListItem } from "@/types/driverViolations";
import { VN_IANA } from "@/lib/vnDateRange";
import { formatViolationCoordinates } from "./driverViolationLabels";
import { Button } from "@/components/ui/button";

type DriverViolationImageLightboxProps = {
  item: DriverViolationListItem | null;
  open: boolean;
  onClose: () => void;
};

function formatOccurredLong(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return formatInTimeZone(d, VN_IANA, "EEEE, dd/MM/yyyy · HH:mm:ss");
  } catch {
    return iso;
  }
}

export function DriverViolationImageLightbox({ item, open, onClose }: DriverViolationImageLightboxProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (open) setImgFailed(false);
  }, [open, item?.id, item?.image_url]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  if (!open || !item) return null;

  const coords = formatViolationCoordinates(item);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/92 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Ảnh vi phạm"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-zoom-out"
        aria-label="Đóng (bấm ra ngoài)"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-12 min-w-[7rem] rounded-2xl text-base font-extrabold shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-12 shrink-0 rounded-2xl shadow-lg"
            aria-label="Đóng"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="size-6" />
          </Button>
        </div>

        <div
          className="flex min-h-0 flex-1 items-center justify-center px-3 pb-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {!imgFailed ? (
            <img
              src={item.image_url}
              alt="Bằng chứng vi phạm"
              className="max-h-[min(72dvh,100%)] max-w-full rounded-lg object-contain shadow-2xl"
              loading="eager"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-white/10 px-8 py-12 text-center backdrop-blur-sm">
              <ImageOff className="size-14 text-white/70" aria-hidden />
              <p className="text-base font-bold">Ảnh lỗi</p>
              <p className="text-sm text-white/75">Không tải được ảnh bằng chứng. Vui lòng thử lại sau.</p>
            </div>
          )}
        </div>

        <div
          className="shrink-0 space-y-1 border-t border-white/10 bg-black/40 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-bold text-white">{item.trip_code}</p>
          <p className="text-xs text-white/85">{formatOccurredLong(item.occurred_at)}</p>
          {coords ? (
            <p className="text-[11px] font-medium tracking-wide text-white/70">GPS: {coords}</p>
          ) : (
            <p className="text-[11px] text-white/55">Không có tọa độ GPS cho sự kiện này</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
