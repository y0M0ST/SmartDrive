import { Router } from 'express';
import { authenticate } from '../../common/middlewares/auth.middleware';
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from './vehicle.controller';
import {
  validateCreateVehicle,
  validateListVehicles,
  validateUpdateVehicle,
  validateVehicleId,
} from './vehicle.validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Lấy danh sách xe khách
 *     tags: [Vehicles]
 *     description: Super Admin xem toàn bộ xe hoặc lọc theo đại lý. Agency Manager chỉ xem xe thuộc đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Số bản ghi mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo biển số xe
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, on_trip, maintenance]
 *         description: Lọc theo trạng thái xe
 *       - in: query
 *         name: agency_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chỉ Super Admin được lọc theo đại lý
 *     responses:
 *       200:
 *         description: Lấy danh sách xe khách thành công
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
 *                   example: Lấy danh sách xe khách thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VehicleResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', validateListVehicles, listVehicles);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Thêm xe khách mới
 *     tags: [Vehicles]
 *     description: Super Admin có thể gán xe vào bất kỳ đại lý active nào. Agency Manager chỉ tạo xe trong đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehiclePayload'
 *     responses:
 *       201:
 *         description: Thêm xe khách thành công
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
 *                   example: Thêm xe khách thành công
 *                 data:
 *                   $ref: '#/components/schemas/VehicleResponse'
 */
router.post('/', validateCreateVehicle, createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Cập nhật xe khách
 *     tags: [Vehicles]
 *     description: Agency Manager chỉ sửa được xe thuộc đại lý của mình. Super Admin có thể chuyển xe sang đại lý khác đang active.
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
 *             $ref: '#/components/schemas/VehiclePayload'
 *     responses:
 *       200:
 *         description: Cập nhật xe khách thành công
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
 *                   example: Cập nhật xe khách thành công
 *                 data:
 *                   $ref: '#/components/schemas/VehicleResponse'
 */
router.put('/:id', validateVehicleId, validateUpdateVehicle, updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Xóa xe khách
 *     tags: [Vehicles]
 *     description: Xóa trực tiếp xe khỏi hệ thống. Không còn flow ẩn hoặc khôi phục cho xe.
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
 *         description: Xóa xe khách thành công
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
 *                   example: Xoa xe khach thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/VehicleDeleteResponse'
 */
router.delete('/:id', validateVehicleId, deleteVehicle);

export default router;