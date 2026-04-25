import { subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export const VN_IANA = "Asia/Ho_Chi_Minh";

export function formatYmdInVN(d: Date): string {
  return formatInTimeZone(d, VN_IANA, "yyyy-MM-dd");
}

export function vnTodayYmd(): string {
  return formatYmdInVN(new Date());
}

/** Tháng hiện tại theo lịch VN (`YYYY-MM`) — khớp query `month` của US_16. */
export function vnCurrentYearMonth(): string {
  return formatInTimeZone(new Date(), VN_IANA, "yyyy-MM");
}

/** Danh sách `YYYY-MM` từ `monthsBack` tháng trước đến tháng hiện tại (VN), mới nhất trước. */
export function vnYearMonthOptions(monthsBack: number): string[] {
  const out: string[] = [];
  const anchor = new Date();
  for (let i = 0; i <= monthsBack; i += 1) {
    const d = subMonths(anchor, i);
    out.push(formatInTimeZone(d, VN_IANA, "yyyy-MM"));
  }
  return out;
}

/** Parse `YYYY-MM-DD` thành `Date` (giữa ngày UTC) để hiển thị trên lịch ổn định. */
export function parseYmdUtcNoon(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
