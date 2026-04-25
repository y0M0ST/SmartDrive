import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { AgencyViolationListItem } from "@/types/violation";

type ViolationDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AgencyViolationListItem | null;
};

function mapsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function ViolationDetailModal({ open, onOpenChange, item }: ViolationDetailModalProps) {
  const lat = item?.latitude ?? null;
  const lng = item?.longitude ?? null;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4">
        <DialogHeader>
          <DialogTitle>Bằng chứng vi phạm</DialogTitle>
        </DialogHeader>
        {item ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={item.image_url}
                alt="Bằng chứng full size"
                loading="eager"
                decoding="async"
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            {hasCoords ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  GPS:{" "}
                  <span className="font-mono text-foreground">
                    {lat!.toFixed(5)}, {lng!.toFixed(5)}
                  </span>
                </p>
                <Button type="button" variant="default" size="sm" asChild className="gap-2">
                  <a href={mapsHref(lat!, lng!)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" aria-hidden />
                    Xem trên Google Maps
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không có tọa độ GPS cho sự kiện này.</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
