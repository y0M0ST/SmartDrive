import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatYmdInVN, parseYmdUtcNoon, VN_IANA } from "@/lib/vnDateRange";

type ViolationDateRangePickerProps = {
  from: string;
  to: string;
  onRangeChange: (range: { from: string; to: string }) => void;
};

function formatRangeLabel(fromYmd: string, toYmd: string): string {
  const pat = "dd/MM/yyyy";
  const a = formatInTimeZone(parseYmdUtcNoon(fromYmd), VN_IANA, pat);
  const b = formatInTimeZone(parseYmdUtcNoon(toYmd), VN_IANA, pat);
  if (fromYmd === toYmd) return a;
  return `${a} — ${b}`;
}

export function ViolationDateRangePicker({ from, to, onRangeChange }: ViolationDateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const selected: DateRange | undefined = useMemo(
    () => ({
      from: parseYmdUtcNoon(from),
      to: parseYmdUtcNoon(to),
    }),
    [from, to],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 min-w-[240px] justify-start gap-2 text-left font-normal"
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{formatRangeLabel(from, to)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={(range) => {
            if (!range?.from) return;
            const nextFrom = formatYmdInVN(range.from);
            const nextTo = range.to ? formatYmdInVN(range.to) : nextFrom;
            onRangeChange({ from: nextFrom, to: nextTo });
            if (range.to) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
