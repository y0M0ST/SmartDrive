/**
 * Danh mục 34 tỉnh, thành phố trực thuộc Trung ương (sau sáp nhập hành chính 2025).
 * Dùng cho dropdown/autocomplete tuyến đường; `start_point` / `end_point` bảng routes lưu `code`.
 */
export interface VietnamProvince {
    /** Mã nội bộ: IN HOA, không dấu, snake_case */
    code: string;
    /** Tên hiển thị tiếng Việt chuẩn */
    name: string;
}

export const VIETNAM_PROVINCES: readonly VietnamProvince[] = [
    { code: 'AN_GIANG', name: 'An Giang' },
    { code: 'BAC_NINH', name: 'Bắc Ninh' },
    { code: 'CA_MAU', name: 'Cà Mau' },
    { code: 'CAO_BANG', name: 'Cao Bằng' },
    { code: 'CAN_THO', name: 'Cần Thơ' },
    { code: 'DA_NANG', name: 'Đà Nẵng' },
    { code: 'DAK_LAK', name: 'Đắk Lắk' },
    { code: 'DIEN_BIEN', name: 'Điện Biên' },
    { code: 'DONG_NAI', name: 'Đồng Nai' },
    { code: 'DONG_THAP', name: 'Đồng Tháp' },
    { code: 'GIA_LAI', name: 'Gia Lai' },
    { code: 'HA_NOI', name: 'Hà Nội' },
    { code: 'HA_TINH', name: 'Hà Tĩnh' },
    { code: 'HAI_PHONG', name: 'Hải Phòng' },
    { code: 'HO_CHI_MINH', name: 'Hồ Chí Minh' },
    { code: 'HUNG_YEN', name: 'Hưng Yên' },
    { code: 'KHANH_HOA', name: 'Khánh Hòa' },
    { code: 'LAI_CHAU', name: 'Lai Châu' },
    { code: 'LANG_SON', name: 'Lạng Sơn' },
    { code: 'LAO_CAI', name: 'Lào Cai' },
    { code: 'LAM_DONG', name: 'Lâm Đồng' },
    { code: 'NGHE_AN', name: 'Nghệ An' },
    { code: 'NINH_BINH', name: 'Ninh Bình' },
    { code: 'PHU_THO', name: 'Phú Thọ' },
    { code: 'QUANG_NGAI', name: 'Quảng Ngãi' },
    { code: 'QUANG_NINH', name: 'Quảng Ninh' },
    { code: 'QUANG_TRI', name: 'Quảng Trị' },
    { code: 'SON_LA', name: 'Sơn La' },
    { code: 'TAY_NINH', name: 'Tây Ninh' },
    { code: 'THAI_NGUYEN', name: 'Thái Nguyên' },
    { code: 'THANH_HOA', name: 'Thanh Hóa' },
    { code: 'THUA_THIEN_HUE', name: 'Thừa Thiên Huế' },
    { code: 'TUYEN_QUANG', name: 'Tuyên Quang' },
    { code: 'VINH_LONG', name: 'Vĩnh Long' },
] as const;

/** Tập mã hợp lệ — dùng validate `start_point` / `end_point` tuyến đường. */
export const VIETNAM_PROVINCE_CODE_SET: ReadonlySet<string> = new Set(
    VIETNAM_PROVINCES.map((p) => p.code),
);

export function isVietnamProvinceCode(code: string): boolean {
    return VIETNAM_PROVINCE_CODE_SET.has(code);
}

/** Chuẩn hóa mã client gửi lên (trim + IN HOA) trước khi kiểm tra / lưu. */
export function normalizeVietnamProvinceCode(value: string): string {
    return value.trim().toUpperCase();
}

const EXPECTED_PROVINCE_COUNT = 34;
if (VIETNAM_PROVINCES.length !== EXPECTED_PROVINCE_COUNT) {
    throw new Error(
        `VIETNAM_PROVINCES must contain exactly ${EXPECTED_PROVINCE_COUNT} entries, got ${VIETNAM_PROVINCES.length}`,
    );
}
