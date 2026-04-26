import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, X, ZoomIn, ZoomOut } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import type { DriverViolationListItem } from "@/types/driverViolations";
import { VN_IANA } from "@/lib/vnDateRange";
import { formatViolationCoordinates } from "./driverViolationLabels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const SWIPE_CLOSE_PX = 72;

export function DriverViolationImageLightbox({ item, open, onClose }: DriverViolationImageLightboxProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const touchY0 = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (open) setImgFailed(false);
    setZoomed(false);
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

  const onImageTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchY0.current = e.touches[0].clientY;
    }
  }, []);

  const onImageTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchY0.current == null || e.changedTouches.length !== 1) return;
      const dy = e.changedTouches[0].clientY - touchY0.current;
      touchY0.current = null;
      if (dy > SWIPE_CLOSE_PX) {
        onClose();
      }
    },
    [onClose],
  );

  const onImageTapZoom = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setZoomed((z) => !z);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="mr-auto hidden max-w-[55%] text-[11px] font-medium text-white/60 min-[380px]:block sm:hidden">
            Vuốt xuống trên ảnh để đóng
          </p>
          {!imgFailed ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="h-12 rounded-2xl px-3 text-sm font-extrabold shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
            >
              {zoomed ? (
                <>
                  <ZoomOut className="mr-1.5 size-4" aria-hidden />
                  Thu nhỏ
                </>
              ) : (
                <>
                  <ZoomIn className="mr-1.5 size-4" aria-hidden />
                  Phóng to
                </>
              )}
            </Button>
          ) : null}
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
          className="flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-auto px-3 pb-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {!imgFailed ? (
            <button
              type="button"
              className="relative max-h-full max-w-full touch-manipulation border-0 bg-transparent p-0"
              onClick={(e) => {
                e.stopPropagation();
                onImageTapZoom();
              }}
              onTouchStart={onImageTouchStart}
              onTouchEnd={onImageTouchEnd}
              aria-label={zoomed ? "Thu nhỏ ảnh (chạm đúp hoặc nút)" : "Phóng to ảnh (chạm đúp hoặc nút)"}
            >
              <img
                src={item.image_url}
                alt="Bằng chứng vi phạm"
                className={cn(
                  "max-h-[min(72dvh,100%)] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200 ease-out",
                  zoomed && "scale-[1.75] cursor-zoom-out",
                  !zoomed && "cursor-zoom-in",
                )}
                style={{ WebkitTapHighlightColor: "transparent" }}
                loading="eager"
                draggable={false}
                onError={() => {
                  setImgFailed(true);
                  toast.error("Không tải được ảnh bằng chứng.");
                }}
              />
            </button>
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
