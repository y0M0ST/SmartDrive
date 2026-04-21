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
/** Chuỗi `YYYY-MM` theo lịch Việt Nam (dùng cho `driver_scores.evaluation_month`). */
export function formatYearMonthInVN(d: Date): string {
    return formatDateInVN(d).slice(0, 7);
}

/** Khoảng thời gian [from, to] cho cả tháng `YYYY-MM` theo múi VN (+07). */
export function vnMonthRangeFromYearMonth(ym: string): { from: Date; to: Date } {
    const m = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!m) {
        throw new Error('evaluation_month phải là YYYY-MM.');
    }
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) {
        throw new Error('Tháng không hợp lệ.');
    }
    const lastDay = new Date(year, month, 0).getDate();
    const ymdEnd = `${ym}-${String(lastDay).padStart(2, '0')}`;
    return {
        from: new Date(`${ym}-01T00:00:00.000+07:00`),
        to: new Date(`${ymdEnd}T23:59:59.999+07:00`),
    };
}

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

/** Mỗi phần tử là `YYYY-MM-DD` (lịch VN), từ `startYmd` đến `endYmd` (cùng inclusive). */
export function enumerateVNDateStringsInclusive(startYmd: string, endYmd: string): string[] {
    const out: string[] = [];
    let cur = vnDayStartIsoDate(startYmd).getTime();
    const last = vnDayStartIsoDate(endYmd).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    while (cur <= last) {
        out.push(formatDateInVN(new Date(cur)));
        cur += dayMs;
    }
    return out;
}
