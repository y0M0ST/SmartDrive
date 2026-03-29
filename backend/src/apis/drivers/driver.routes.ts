import { Router } from 'express';
import { authenticate } from '../../common/middlewares/auth.middleware';
import {
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
} from './driver.controller';
import {
  validateCreateDriver,
  validateDriverId,
  validateListDrivers,
  validateUpdateDriver,
} from './driver.validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Lấy danh sách tài xế
 *     tags: [Drivers]
 *     description: Super Admin xem toàn bộ tài xế hoặc lọc theo đại lý. Agency Manager chỉ xem tài xế thuộc đại lý của mình.
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
 *         description: Tìm theo tên tài xế hoặc số điện thoại
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, on_trip, banned]
 *         description: Lọc theo trạng thái tài xế
 *       - in: query
 *         name: agency_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chỉ Super Admin được lọc theo đại lý
 *     responses:
 *       200:
 *         description: Lấy danh sách tài xế thành công
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
 *                   example: Lấy danh sách tài xế thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DriverResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', validateListDrivers, listDrivers);

/**
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Thêm tài xế mới
 *     tags: [Drivers]
 *     description: Super Admin có thể gán tài xế vào bất kỳ đại lý active nào. Agency Manager chỉ tạo tài xế trong đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DriverPayload'
 *     responses:
 *       201:
 *         description: Thêm tài xế thành công
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
 *                   example: Thêm tài xế thành công
 *                 data:
 *                   $ref: '#/components/schemas/DriverResponse'
 */
router.post('/', validateCreateDriver, createDriver);

/**
 * @swagger
 * /api/drivers/{id}:
 *   put:
 *     summary: Cập nhật tài xế
 *     tags: [Drivers]
 *     description: Agency Manager chỉ sửa được tài xế thuộc đại lý của mình. Super Admin có thể chuyển tài xế sang đại lý khác đang active.
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
 *             $ref: '#/components/schemas/DriverPayload'
 *     responses:
 *       200:
 *         description: Cập nhật tài xế thành công
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
 *                   example: Cập nhật tài xế thành công
 *                 data:
 *                   $ref: '#/components/schemas/DriverResponse'
 */
router.put('/:id', validateDriverId, validateUpdateDriver, updateDriver);

/**
 * @swagger
 * /api/drivers/{id}:
 *   delete:
 *     summary: Xóa tài xế
 *     tags: [Drivers]
 *     description: Xóa trực tiếp tài xế khỏi hệ thống. Không còn flow ẩn hoặc khôi phục cho tài xế.
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
 *         description: Xóa tài xế thành công
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
 *                   example: Xoa tai xe thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/DriverDeleteResponse'
 */
router.delete('/:id', validateDriverId, deleteDriver);

export default router;