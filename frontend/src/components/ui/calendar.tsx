import * as React from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Lịch (react-day-picker v9) — style mặc định từ `react-day-picker/style.css` (import ở `main.tsx`). */
function Calendar({ className, locale = vi, ...props }: CalendarProps) {
  return <DayPicker locale={locale} className={cn("p-2", className)} {...props} />;
}
Calendar.displayName = "Calendar";

export { Calendar };
