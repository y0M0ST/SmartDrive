"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvinces = getProvinces;
const province_constant_1 = require("./province.constant");
/** Chuẩn hóa chuỗi để so khớp tìm kiếm: bỏ dấu, lowercase. */
function normalizeForSearch(input) {
    const nfd = input.normalize('NFD');
    const withoutCombining = nfd.replace(/\p{M}/gu, '');
    return withoutCombining.replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}
/**
 * Lấy danh sách tỉnh/thành từ constant.
 * `search`: lọc theo `code` hoặc `name`, không phân biệt hoa thường và dấu.
 */
function getProvinces(search) {
    const trimmed = typeof search === 'string' ? search.trim() : '';
    const needle = trimmed.length > 0 ? normalizeForSearch(trimmed) : '';
    const base = trimmed.length === 0
        ? [...province_constant_1.VIETNAM_PROVINCES]
        : province_constant_1.VIETNAM_PROVINCES.filter((p) => {
            const haystack = `${normalizeForSearch(p.code)} ${normalizeForSearch(p.name)}`;
            return haystack.includes(needle);
        });
    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
//# sourceMappingURL=province.service.js.map