import { cn } from "@/lib/utils";

type ViolationEvidenceThumbProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Thumbnail bằng chứng — `loading="lazy"` + `decoding="async"`. */
export function ViolationEvidenceThumb({ src, alt, className }: ViolationEvidenceThumbProps) {
  return (
    <div
      className={cn(
        "relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </div>
  );
}
