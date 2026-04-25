import { formatInTimeZone } from "date-fns-tz";

export const VN_IANA = "Asia/Ho_Chi_Minh";

export function formatYmdInVN(d: Date): string {
  return formatInTimeZone(d, VN_IANA, "yyyy-MM-dd");
}

export function vnTodayYmd(): string {
  return formatYmdInVN(new Date());
}

/** Parse `YYYY-MM-DD` thành `Date` (giữa ngày UTC) để hiển thị trên lịch ổn định. */
export function parseYmdUtcNoon(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
