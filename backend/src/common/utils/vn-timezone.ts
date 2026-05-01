/** Múi giờ nghiệp vụ cho nhà xe (GMT+7, không DST). */
export const VN_IANA = 'Asia/Ho_Chi_Minh';

/** Lấy chuỗi `YYYY-MM-DD` theo lịch Việt Nam tại thời điểm `d`. */
export function formatDateInVN(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: VN_IANA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

/** 00:00:00.000 cùng ngày lịch `YYYY-MM-DD` tại VN → `Date` (UTC lưu trong JS). */
export function vnDayStartIsoDate(ymd: string): Date {
    return new Date(`${ymd}T00:00:00.000+07:00`);
}

/** 23:59:59.999 cùng ngày lịch `YYYY-MM-DD` tại VN. */
export function vnDayEndIsoDate(ymd: string): Date {
    return new Date(`${ymd}T23:59:59.999+07:00`);
}

/** Khoảng [from, to] cho “hôm nay” theo lịch VN. */
export function vnTodayRange(now = new Date()): { from: Date; to: Date } {
    const ymd = formatDateInVN(now);
    return { from: vnDayStartIsoDate(ymd), to: vnDayEndIsoDate(ymd) };
}

/** Chuỗi ngày VN từ `Date` hoặc ISO string (lấy theo lịch VN). */
export function toVNDateString(input: Date | string): string {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input;
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) {
        throw new Error('Ngày không hợp lệ.');
    }
    return formatDateInVN(d);
}
