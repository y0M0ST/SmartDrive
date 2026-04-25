import { useState } from "react";
import { ImageOff, MapPin } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import type { DriverViolationListItem } from "@/types/driverViolations";
import { VN_IANA } from "@/lib/vnDateRange";
import { formatViolationCoordinates, violationBadgeClass, violationTypeLabel } from "./driverViolationLabels";
import { cn } from "@/lib/utils";

type DriverViolationCardProps = {
  item: DriverViolationListItem;
  onOpenDetail: (item: DriverViolationListItem) => void;
};

function formatOccurredAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return formatInTimeZone(d, VN_IANA, "dd/MM/yyyy · HH:mm");
  } catch {
    return iso;
  }
}

export function DriverViolationCard({ item, onOpenDetail }: DriverViolationCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const coordsText = formatViolationCoordinates(item);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-600/50 dark:bg-[#1e293b]",
        "md:border-border md:bg-card",
      )}
    >
      <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          className="relative size-[88px] shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80 transition active:scale-[0.98] dark:bg-slate-800 dark:ring-slate-600/60 sm:size-24"
          aria-label="Xem ảnh vi phạm phóng to"
        >
          {!imgFailed ? (
            <img
              src={item.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 bg-muted px-1 text-center">
              <ImageOff className="size-6 text-muted-foreground" aria-hidden />
              <span className="text-[9px] font-bold leading-tight text-muted-foreground">Ảnh lỗi</span>
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ring-1 ring-inset",
                violationBadgeClass(item.type),
              )}
            >
              {violationTypeLabel(item.type)}
            </span>
          </div>
          <p className="text-[13px] font-bold leading-snug text-foreground">{item.trip_code}</p>
          <p className="text-xs font-medium text-muted-foreground">{formatOccurredAt(item.occurred_at)}</p>
          {coordsText ? (
            <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="line-clamp-2">{coordsText}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
