import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as agencyController from './agency.controller';
import {
    changeAgencyStatusSchema,
    createAgencySchema,
    getAgencyQuerySchema,
    updateAgencySchema,
} from './agency.dto';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Agencies
 *     description: Quản lý thông tin Nhà xe (Agency)
 */

/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Lấy danh sách nhà xe (phân trang, tìm kiếm, lọc trạng thái)
 *     description: |
 *       **SUPER_ADMIN:** xem toàn bộ nhà xe (lọc `search`, `status`).
 *       **AGENCY_ADMIN:** chỉ thấy đúng nhà xe gắn với `agency_id` trong JWT; nếu tài khoản không có agency → 403.
 *       Query `page` / `limit` là chuỗi số (Zod), mặc định "1" / "10".
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Kích thước trang
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc mã nhà xe (ILIKE)
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Query không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền hoặc agency admin không hợp lệ
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/', validate(getAgencyQuerySchema), agencyController.getAgencies);

/**
 * @swagger
 * /api/agencies:
 *   post:
 *     summary: Tạo nhà xe mới
 *     description: |
 *       **Chỉ SUPER_ADMIN** được gọi API này. Body khớp `createAgencySchema`: `code` / `name` tối thiểu 2 ký tự sau trim;
 *       `phone` nếu có thì tối thiểu 10 ký tự.
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 2
 *                 example: AGENCY_11
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Nhà xe Phương Trang
 *               address:
 *                 type: string
 *                 example: 123 Lê Duẩn, Đà Nẵng
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 example: "0900000111"
 *     responses:
 *       201:
 *         description: Tạo nhà xe thành công
 *       400:
 *         description: Dữ liệu không hợp lệ (Zod)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải super admin
 *       409:
 *         description: Trùng mã nhà xe hoặc xung đột (nếu có)
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/', validate(createAgencySchema), agencyController.createAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   put:
 *     summary: Cập nhật thông tin nhà xe (tên, địa chỉ, SĐT)
 *     description: |
 *       Body khớp `updateAgencySchema` (các trường optional; `name` tối thiểu 2 ký tự nếu gửi; `phone` tối thiểu 10 ký tự nếu gửi).
 *       Phạm vi sửa theo quyền (super admin vs agency admin chỉ sửa nhà xe của mình — theo service).
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID nhà xe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Nhà xe Phương Trang (Update)
 *               address:
 *                 type: string
 *                 example: 456 Hoàng Diệu, Đà Nẵng
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 example: "0912345678"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không được phép sửa nhà xe này
 *       404:
 *         description: Không tìm thấy nhà xe
 *       500:
 *         description: Lỗi máy chủ
 */
router.put('/:id', validate(updateAgencySchema), agencyController.updateAgency);

/**
 * @swagger
 * /api/agencies/{id}/status:
 *   patch:
 *     summary: Thay đổi trạng thái nhà xe (ACTIVE / INACTIVE)
 *     description: Body khớp `changeAgencyStatusSchema`.
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID nhà xe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: "INACTIVE"
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 *       400:
 *         description: Payload không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền hoặc không được thao tác trên nhà xe này
 *       404:
 *         description: Không tìm thấy nhà xe
 *       500:
 *         description: Lỗi máy chủ
 */
router.patch(
    '/:id/status',
    validate(changeAgencyStatusSchema),
    agencyController.changeAgencyStatus,
);

export default router;