import { Router } from 'express';
import { authenticate, requireManagement, requirePermission } from '../../common/middlewares/auth.middleware';
import { createVehicle, deleteVehicle, getVehicleById, listVehicles, updateVehicle } from './vehicle.controller';
import { validateCreateVehicle, validateListVehicles, validateUpdateVehicle, validateVehicleId } from './vehicle.validator';

const router = Router();
router.use(authenticate);
router.use(requireManagement);

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Quản lý xe khách
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Lấy danh sách xe khách
 *     tags: [Vehicles]
 *     description: Super Admin xem tất cả. Agency Manager chỉ xem xe trong đại lý của mình.
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
 *         description: Tìm theo biển số
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, on_trip, maintenance, retired]
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
router.get('/', validateListVehicles, requirePermission('manage_vehicles'), listVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Lấy chi tiết xe khách
 *     tags: [Vehicles]
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
router.get('/:id', validateVehicleId, requirePermission('manage_vehicles'), getVehicleById);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Thêm xe khách mới
 *     tags: [Vehicles]
 *     description: Super Admin gán vào bất kỳ đại lý nào. Agency Manager chỉ tạo trong đại lý của mình. Hỗ trợ mã camera AI (camera_code).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate_number]
 *             properties:
 *               plate_number:
 *                 type: string
 *                 example: 43B-123.45
 *               model:
 *                 type: string
 *                 example: Universe
 *               type:
 *                 type: string
 *                 example: ghe_ngoi
 *               capacity:
 *                 type: integer
 *                 example: 45
 *               agency_id:
 *                 type: string
 *                 format: uuid
 *                 description: Bắt buộc nếu là Super Admin
 *               camera_code:
 *                 type: string
 *                 example: CAM_001
 *                 description: Mã camera AI (tùy chọn)
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       409:
 *         description: Biển số hoặc mã camera đã tồn tại
 */
router.post('/', validateCreateVehicle, requirePermission('manage_vehicles'), createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Cập nhật xe khách
 *     tags: [Vehicles]
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
 *               plate_number:
 *                 type: string
 *               model:
 *                 type: string
 *               type:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [available, on_trip, maintenance, retired]
 *               camera_code:
 *                 type: string
 *                 nullable: true
 *                 description: Truyền null để gỡ camera
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', validateVehicleId, validateUpdateVehicle, requirePermission('manage_vehicles'), updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Xóa xe khách (soft delete)
 *     tags: [Vehicles]
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
 *         description: Xe đang trong chuyến
 */
router.delete('/:id', validateVehicleId, requirePermission('manage_vehicles'), deleteVehicle);

export default router;