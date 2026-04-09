import { Router, Request, Response } from 'express';
import { authenticate, requireManagement } from '../../common/middlewares/auth.middleware';

const router = Router();

const VIETNAM_PROVINCES = [
  { code: 'AG',   name: 'An Giang - Kiên Giang' },
  { code: 'BRV',  name: 'Bà Rịa - Vũng Tàu' },
  { code: 'BNH',  name: 'Bắc Ninh - Hưng Yên' },
  { code: 'BDG',  name: 'Bình Dương' },
  { code: 'BPC',  name: 'Bình Phước - Tây Ninh' },
  { code: 'BTH',  name: 'Bình Thuận - Ninh Thuận' },
  { code: 'CMau', name: 'Cà Mau - Bạc Liêu' },
  { code: 'CT',   name: 'Cần Thơ - Hậu Giang - Sóc Trăng' },
  { code: 'DL',   name: 'Đắk Lắk - Đắk Nông' },
  { code: 'DN',   name: 'Đà Nẵng - Quảng Nam' },
  { code: 'DNai', name: 'Đồng Nai' },
  { code: 'DT',   name: 'Đồng Tháp - Vĩnh Long - Trà Vinh' },
  { code: 'GL',   name: 'Gia Lai - Kon Tum' },
  { code: 'HN',   name: 'Hà Nội' },
  { code: 'HNam', name: 'Hà Nam - Nam Định - Ninh Bình' },
  { code: 'HGG',  name: 'Hà Giang - Tuyên Quang' },
  { code: 'HT',   name: 'Hà Tĩnh - Quảng Bình' },
  { code: 'QNinh',name: 'Quảng Ninh - Hải Ninh' },
  { code: 'HP',   name: 'Hải Phòng - Thái Bình' },
  { code: 'HCM',  name: 'Hồ Chí Minh' },
  { code: 'HB',   name: 'Hòa Bình - Sơn La - Điện Biên' },
  { code: 'KH',   name: 'Khánh Hòa - Phú Yên' },
  { code: 'LS',   name: 'Lạng Sơn - Cao Bằng' },
  { code: 'LCI',  name: 'Lào Cai - Yên Bái' },
  { code: 'LD',   name: 'Lâm Đồng' },
  { code: 'LT',   name: 'Long An - Tiền Giang - Bến Tre' },
  { code: 'TNguyen', name: 'Thái Nguyên - Bắc Kạn' },
  { code: 'HUE',  name: 'Thừa Thiên Huế - Quảng Trị' },
  { code: 'TH',   name: 'Thanh Hóa - Nghệ An' },
  { code: 'QNgai',name: 'Quảng Ngãi - Bình Định' },
  { code: 'VPC',  name: 'Vĩnh Phúc - Phú Thọ' },
  { code: 'HDB',  name: 'Hải Dương - Bắc Giang' },
  { code: 'HD',   name: 'Hà Đông - Hòa Bình' },
  { code: 'PB',   name: 'Phú Bình - Thái Nguyên' },
];

router.use(authenticate);
router.use(requireManagement);

/**
 * @swagger
 * /api/locations/provinces:
 *   get:
 *     summary: Lấy danh sách 34 tỉnh thành Việt Nam
 *     tags: [Locations]
 *     description: Dữ liệu cố định 34 tỉnh thành sau sáp nhập 2025. Dùng cho dropdown điểm đi/đến.
 *     security:
 *       - bearerAuth: []
 */
router.get('/provinces', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Lấy danh sách tỉnh thành thành công',
    data: VIETNAM_PROVINCES,
    total: VIETNAM_PROVINCES.length,
  });
});

export default router;