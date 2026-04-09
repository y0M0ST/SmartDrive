import { Router } from 'express';
import { authenticate, requireManagement, requirePermission } from '../../common/middlewares/auth.middleware';
import { createDriver, deleteDriver, getDriverById, listDrivers, updateDriver } from './driver.controller';
import { validateCreateDriver, validateDriverId, validateListDrivers, validateUpdateDriver } from './driver.validator';

const router = Router();
router.use(authenticate);
router.use(requireManagement);

/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Quản lý hồ sơ tài xế
 */

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Lấy danh sách tài xế
 *     tags: [Drivers]
 *     description: Super Admin xem tất cả. Agency Manager chỉ xem tài xế trong đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc SĐT
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, on_trip, inactive, banned]
 *       - in: query
 *         name: agency_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chỉ Super Admin được lọc theo đại lý
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', validateListDrivers, requirePermission('manage_drivers'), listDrivers);

/**
 * @swagger
 * /api/drivers/{id}:
 *   get:
 *     summary: Lấy chi tiết tài xế
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', validateDriverId, requirePermission('manage_drivers'), getDriverById);

/**
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Thêm tài xế mới
 *     tags: [Drivers]
 *     description: Super Admin gán vào bất kỳ đại lý nào. Agency Manager chỉ tạo trong đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, phone, identity_card, license_number, license_type, license_expiry]
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Nguyễn Văn Test
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               identity_card:
 *                 type: string
 *                 example: "048123456789"
 *               license_number:
 *                 type: string
 *                 example: DL999
 *               license_type:
 *                 type: string
 *                 enum: [A1, A2, B1, B2, C, D, E, F]
 *                 example: D
 *               license_expiry:
 *                 type: string
 *                 format: date
 *                 example: "2028-12-31"
 *               agency_id:
 *                 type: string
 *                 format: uuid
 *                 description: Bắt buộc nếu là Super Admin
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: Liên kết với tài khoản đăng nhập
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       409:
 *         description: Trùng SĐT, bằng lái hoặc CCCD
 */
router.post('/', validateCreateDriver, requirePermission('manage_drivers'), createDriver);

/**
 * @swagger
 * /api/drivers/{id}:
 *   put:
 *     summary: Cập nhật tài xế
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               license_number:
 *                 type: string
 *               license_type:
 *                 type: string
 *               license_expiry:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [active, on_trip, inactive, banned]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', validateDriverId, validateUpdateDriver, requirePermission('manage_drivers'), updateDriver);

/**
 * @swagger
 * /api/drivers/{id}:
 *   delete:
 *     summary: Xóa tài xế (soft delete — chuyển sang inactive)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       409:
 *         description: Tài xế đang trong chuyến
 */
router.delete('/:id', validateDriverId, requirePermission('manage_drivers'), deleteDriver);

export default router;