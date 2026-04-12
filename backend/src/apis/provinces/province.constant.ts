/**
 * Danh mục 34 tỉnh, thành phố trực thuộc Trung ương (sau sáp nhập hành chính 2025).
 * Dùng cho dropdown/autocomplete tuyến đường; `start_point` / `end_point` bảng routes lưu `code`.
 * `lat` / `lng`: tọa độ WGS84 (điểm trung tâm hành chính / TP tỉnh), phục vụ tính quãng đường (Mapbox).
 */
export interface VietnamProvince {
    /** Mã nội bộ: IN HOA, không dấu, snake_case */
    code: string;
    /** Tên hiển thị tiếng Việt chuẩn */
    name: string;
    /** Vĩ độ (WGS84) */
    lat: number;
    /** Kinh độ (WGS84) */
    lng: number;
}

export const VIETNAM_PROVINCES: VietnamProvince[] = [
    { code: 'AN_GIANG', name: 'An Giang', lat: 10.3866, lng: 105.4372 },
    { code: 'BAC_NINH', name: 'Bắc Ninh', lat: 21.1782, lng: 106.071 },
    { code: 'CA_MAU', name: 'Cà Mau', lat: 9.175, lng: 105.152 },
    { code: 'CAO_BANG', name: 'Cao Bằng', lat: 22.6657, lng: 106.2525 },
    { code: 'CAN_THO', name: 'Cần Thơ', lat: 10.0452, lng: 105.7469 },
    { code: 'DA_NANG', name: 'Đà Nẵng', lat: 16.0471, lng: 108.2068 },
    { code: 'DAK_LAK', name: 'Đắk Lắk', lat: 12.6667, lng: 108.0378 },
    { code: 'DIEN_BIEN', name: 'Điện Biên', lat: 21.3864, lng: 103.0153 },
    { code: 'DONG_NAI', name: 'Đồng Nai', lat: 10.9447, lng: 106.8243 },
    { code: 'DONG_THAP', name: 'Đồng Tháp', lat: 10.4602, lng: 105.6329 },
    { code: 'GIA_LAI', name: 'Gia Lai', lat: 13.9719, lng: 108.0147 },
    { code: 'HA_NOI', name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
    { code: 'HA_TINH', name: 'Hà Tĩnh', lat: 18.3428, lng: 105.9057 },
    { code: 'HAI_PHONG', name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
    { code: 'HO_CHI_MINH', name: 'Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
    { code: 'HUNG_YEN', name: 'Hưng Yên', lat: 20.6464, lng: 106.0511 },
    { code: 'KHANH_HOA', name: 'Khánh Hòa', lat: 12.2388, lng: 109.1967 },
    { code: 'LAI_CHAU', name: 'Lai Châu', lat: 22.3964, lng: 103.4585 },
    { code: 'LANG_SON', name: 'Lạng Sơn', lat: 21.8536, lng: 106.7614 },
    { code: 'LAO_CAI', name: 'Lào Cai', lat: 22.4857, lng: 103.9707 },
    { code: 'LAM_DONG', name: 'Lâm Đồng', lat: 11.9404, lng: 108.4583 },
    { code: 'NGHE_AN', name: 'Nghệ An', lat: 18.6796, lng: 105.6813 },
    { code: 'NINH_BINH', name: 'Ninh Bình', lat: 20.2509, lng: 105.9745 },
    { code: 'PHU_THO', name: 'Phú Thọ', lat: 21.322, lng: 105.406 },
    { code: 'QUANG_NGAI', name: 'Quảng Ngãi', lat: 15.1214, lng: 108.8044 },
    { code: 'QUANG_NINH', name: 'Quảng Ninh', lat: 20.9501, lng: 107.0739 },
    { code: 'QUANG_TRI', name: 'Quảng Trị', lat: 16.8163, lng: 107.1003 },
    { code: 'SON_LA', name: 'Sơn La', lat: 21.3243, lng: 103.914 },
    { code: 'TAY_NINH', name: 'Tây Ninh', lat: 11.3354, lng: 106.11 },
    { code: 'THAI_NGUYEN', name: 'Thái Nguyên', lat: 21.5928, lng: 105.8442 },
    { code: 'THANH_HOA', name: 'Thanh Hóa', lat: 19.8067, lng: 105.7851 },
    { code: 'THUA_THIEN_HUE', name: 'Thừa Thiên Huế', lat: 16.4637, lng: 107.5909 },
    { code: 'TUYEN_QUANG', name: 'Tuyên Quang', lat: 21.8236, lng: 105.2142 },
    { code: 'VINH_LONG', name: 'Vĩnh Long', lat: 10.2529, lng: 105.972 },
];

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
