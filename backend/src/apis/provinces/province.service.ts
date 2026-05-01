import type { VietnamProvince } from './province.constant';
import { VIETNAM_PROVINCES } from './province.constant';

/** Chuẩn hóa chuỗi để so khớp tìm kiếm: bỏ dấu, lowercase. */
function normalizeForSearch(input: string): string {
    const nfd = input.normalize('NFD');
    const withoutCombining = nfd.replace(/\p{M}/gu, '');
    return withoutCombining.replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}

/**
 * Lấy danh sách tỉnh/thành từ constant.
 * `search`: lọc theo `code` hoặc `name`, không phân biệt hoa thường và dấu.
 */
export function getProvinces(search?: string): VietnamProvince[] {
    const trimmed = typeof search === 'string' ? search.trim() : '';
    const needle = trimmed.length > 0 ? normalizeForSearch(trimmed) : '';
    const base =
        trimmed.length === 0
            ? [...VIETNAM_PROVINCES]
            : VIETNAM_PROVINCES.filter((p) => {
                  const haystack = `${normalizeForSearch(p.code)} ${normalizeForSearch(p.name)}`;
                  return haystack.includes(needle);
              });

    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
