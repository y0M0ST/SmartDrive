import { Construction } from "lucide-react";

type AgencyPlaceholderPageProps = {
  title: string;
  description?: string;
};

/**
 * Trang giữ chỗ cho tính năng agency chưa làm — không redirect về dashboard.
 */
export default function AgencyPlaceholderPage({ title, description }: AgencyPlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border bg-muted/30 px-8 py-16 text-center">
      <Construction className="mb-4 size-14 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-black tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description ??
          "Tính năng đang được phát triển theo sprint. Vui lòng quay lại sau — trang này cố ý để trống để team dev triển khai dần."}
      </p>
    </div>
  );
}
