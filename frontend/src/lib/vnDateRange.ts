import { endOfMonth, endOfQuarter, startOfQuarter, subDays, subMonths } from "date-fns";
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

/** Ngày đầu và cuối của tháng hiện tại theo lịch VN (`YYYY-MM-DD`). */
export function vnCurrentFullMonthRangeYmd(): { from: string; to: string } {
  const ym = vnCurrentYearMonth();
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m0 = Number(mStr) - 1;
  const mid = new Date(Date.UTC(y, m0, 15, 12, 0, 0));
  const to = formatInTimeZone(endOfMonth(mid), VN_IANA, "yyyy-MM-dd");
  return { from: `${ym}-01`, to };
}

/** 7 ngày gần nhất theo lịch VN (từ −6 đến hôm nay, inclusive). */
export function vnRolling7DaysRangeYmd(): { from: string; to: string } {
  const to = vnTodayYmd();
  const toNoon = parseYmdUtcNoon(to);
  const fromNoon = subDays(toNoon, 6);
  return {
    from: formatInTimeZone(fromNoon, VN_IANA, "yyyy-MM-dd"),
    to,
  };
}

/** Quý lịch chứa “hôm nay” theo múi VN (đầu quý → cuối quý). */
export function vnCurrentQuarterRangeYmd(): { from: string; to: string } {
  const anchor = parseYmdUtcNoon(vnTodayYmd());
  const start = startOfQuarter(anchor);
  const end = endOfQuarter(anchor);
  return {
    from: formatInTimeZone(start, VN_IANA, "yyyy-MM-dd"),
    to: formatInTimeZone(end, VN_IANA, "yyyy-MM-dd"),
  };
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
