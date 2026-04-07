import { Router, Request, Response } from 'express';
import { authenticate, requireManagementAccess } from '../../common/middlewares/auth.middleware';

const router = Router();

// Danh sách 34 tỉnh thành Việt Nam (sau sáp nhập 2025)
const VIETNAM_PROVINCES = [
  { code: 'AG',  name: 'An Giang' },
  { code: 'BRV', name: 'Bà Rịa - Vũng Tàu' },
  { code: 'BNH', name: 'Bắc Ninh - Hưng Yên' },
  { code: 'BDG', name: 'Bình Dương' },
  { code: 'BPC', name: 'Bình Phước - Tây Ninh' },
  { code: 'BTH', name: 'Bình Thuận - Ninh Thuận' },
  { code: 'CaMau',name:'Cà Mau - Bạc Liêu' },
  { code: 'CT',  name: 'Cần Thơ - Hậu Giang - Sóc Trăng' },
  { code: 'DL',  name: 'Đắk Lắk - Đắk Nông' },
  { code: 'DN',  name: 'Đà Nẵng - Quảng Nam' },
  { code: 'DNai',name: 'Đồng Nai' },
  { code: 'DT',  name: 'Đồng Tháp - Vĩnh Long - Trà Vinh' },
  { code: 'GL',  name: 'Gia Lai - Kon Tum' },
  { code: 'HN',  name: 'Hà Nội' },
  { code: 'HNam',name: 'Hà Nam - Nam Định - Ninh Bình' },
  { code: 'HGG', name: 'Hà Giang - Tuyên Quang' },
  { code: 'HT',  name: 'Hà Tĩnh - Quảng Bình' },
  { code: 'HNinh',name:'Hải Ninh - Quảng Ninh' },
  { code: 'HP',  name: 'Hải Phòng - Thái Bình' },
  { code: 'HCM', name: 'Hồ Chí Minh' },
  { code: 'HB',  name: 'Hòa Bình - Sơn La - Điện Biên' },
  { code: 'KG',  name: 'Kiên Giang - An Giang' },
  { code: 'KH',  name: 'Khánh Hòa - Phú Yên' },
  { code: 'LS',  name: 'Lạng Sơn - Cao Bằng' },
  { code: 'LCI', name: 'Lào Cai - Yên Bái' },
  { code: 'LD',  name: 'Lâm Đồng' },
  { code: 'LT',  name: 'Long An - Tiền Giang - Bến Tre' },
  { code: 'PB',  name: 'Phú Bình - Thái Nguyên - Bắc Kạn' },
  { code: 'QB',  name: 'Quảng Bình - Quảng Trị - Thừa Thiên Huế' },
  { code: 'QNgai',name:'Quảng Ngãi - Bình Định' },
  { code: 'TH',  name: 'Thanh Hóa - Nghệ An' },
  { code: 'VPC', name: 'Vĩnh Phúc - Phú Thọ' },
  { code: 'YB',  name: 'Yên Bái - Lào Cai' },
  { code: 'HDB', name: 'Hải Dương - Bắc Giang' },
];

router.use(authenticate);
router.use(requireManagementAccess);

/**
 * @swagger
 * /api/locations/provinces:
 *   get:
 *     summary: Lấy danh sách 34 tỉnh thành Việt Nam
 *     tags: [Locations]
 *     description: Trả về danh sách 34 tỉnh thành sau sáp nhập 2025. Dùng làm dữ liệu gốc cho dropdown điểm đi/điểm đến khi tạo tuyến đường.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách tỉnh thành thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách tỉnh thành thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: DN
 *                       name:
 *                         type: string
 *                         example: Đà Nẵng - Quảng Nam
 *                 total:
 *                   type: integer
 *                   example: 34
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