import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function ymDisplayLabel(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `Tháng ${Number(m)}/${y}`;
}

type DriverViolationsFilterBarProps = {
  month: string;
  monthOptions: string[];
  onMonthChange: (ym: string) => void;
  tripCodeInput: string;
  onTripCodeInputChange: (v: string) => void;
  onApplyTripFilter: () => void;
  className?: string;
};

export function DriverViolationsFilterBar({
  month,
  monthOptions,
  onMonthChange,
  tripCodeInput,
  onTripCodeInputChange,
  onApplyTripFilter,
  className,
}: DriverViolationsFilterBarProps) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-600/50 dark:bg-[#1e293b]",
        "md:border-border md:bg-card md:shadow-none",
        className,
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="driver-violation-month" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Tháng (lịch Việt Nam)
        </Label>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger
            id="driver-violation-month"
            className="h-11 w-full rounded-xl border-slate-200 bg-white text-[15px] font-semibold dark:border-slate-600 dark:bg-slate-900/60"
          >
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {monthOptions.map((ym) => (
              <SelectItem key={ym} value={ym} className="rounded-lg font-medium">
                {ymDisplayLabel(ym)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driver-violation-trip" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Mã chuyến (tùy chọn)
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="driver-violation-trip"
              value={tripCodeInput}
              onChange={(e) => onTripCodeInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onApplyTripFilter();
                }
              }}
              placeholder="VD: TRIP-20260418-ABC"
              className="h-11 rounded-xl border-slate-200 pl-10 text-[15px] dark:border-slate-600 dark:bg-slate-900/60"
              autoCapitalize="characters"
              autoCorrect="off"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-11 shrink-0 rounded-xl px-5 text-sm font-bold sm:w-auto"
            onClick={onApplyTripFilter}
          >
            Lọc
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Để trống để xem mọi chuyến trong tháng. Mã chuyến phải khớp chính xác theo hệ thống.
        </p>
      </div>
    </div>
  );
}
