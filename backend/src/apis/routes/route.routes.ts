import { Router } from 'express';
import { authenticate } from '../../common/middlewares/auth.middleware';
import {
  listRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
} from './route.controller';
import {
  validateRouteId,
  validateListRoutes,
  validateCreateRoute,
  validateUpdateRoute,
} from './route.validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Lấy danh sách tuyến đường
 *     tags: [Routes]
 *     description: Cả super_admin và agency_manager đều xem được toàn bộ danh sách tuyến đường.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo tên tuyến, điểm đi hoặc điểm đến
 *       - in: query
 *         name: is_active
 *         schema: { type: string, enum: ['true', 'false'] }
 *         description: Lọc theo trạng thái khai thác
 *     responses:
 *       200:
 *         description: Lấy danh sách tuyến đường thành công
 */
router.get('/', validateListRoutes, listRoutes);

/**
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Lấy chi tiết một tuyến đường
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Không tìm thấy tuyến đường
 */
router.get('/:id', validateRouteId, getRouteById);

/**
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Thêm tuyến đường mới
 *     tags: [Routes]
 *     description: Cả super_admin và agency_manager đều được tạo tuyến đường.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, origin, destination]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Đà Nẵng - Huế
 *               origin:
 *                 type: string
 *                 example: Đà Nẵng
 *               destination:
 *                 type: string
 *                 example: Huế
 *               distance_km:
 *                 type: number
 *                 example: 105.5
 *                 description: Cự ly km, phải > 0
 *               estimated_duration_min:
 *                 type: integer
 *                 example: 150
 *                 description: Thời gian dự kiến (phút), phải > 0
 *     responses:
 *       201:
 *         description: Thêm tuyến đường thành công
 *       400:
 *         description: Điểm đi và điểm đến trùng nhau hoặc thiếu thông tin
 *       409:
 *         description: Tên tuyến đường đã tồn tại
 */
router.post('/', validateCreateRoute, createRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Cập nhật tuyến đường
 *     tags: [Routes]
 *     description: |
 *       Cập nhật thông tin tuyến đường.
 *       Lưu ý: Không thể đặt `is_active = false` nếu tuyến đang có chuyến đi `scheduled` hoặc `active`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:                   { type: string }
 *               origin:                 { type: string }
 *               destination:            { type: string }
 *               distance_km:            { type: number }
 *               estimated_duration_min: { type: integer }
 *               is_active:              { type: boolean }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Điểm đi và điểm đến trùng nhau
 *       404:
 *         description: Không tìm thấy tuyến đường
 *       409:
 *         description: Tên tuyến trùng hoặc đang có lịch trình hoạt động
 */
router.put('/:id', validateRouteId, validateUpdateRoute, updateRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   delete:
 *     summary: Xóa tuyến đường
 *     tags: [Routes]
 *     description: |
 *       Không thể xóa tuyến đang có chuyến đi `scheduled` hoặc `active`.
 *       Nếu tuyến đã có dữ liệu lịch sử (completed trips), cũng sẽ bị chặn.
 *       Khuyến nghị: Dùng `PUT /:id` để đặt `is_active = false` thay vì xóa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy tuyến đường
 *       409:
 *         description: Không thể xóa (đang có lịch trình hoặc dữ liệu lịch sử)
 */
router.delete('/:id', validateRouteId, deleteRoute);

export default router;