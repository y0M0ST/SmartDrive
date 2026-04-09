import { Router } from 'express';
import { authenticate, requireManagement, requirePermission } from '../../common/middlewares/auth.middleware';
import { createRoute, deleteRoute, getRouteById, listRoutes, updateRoute } from './route.controller';
import { validateCreateRoute, validateRouteId, validateUpdateRoute } from './route.validator';

const router = Router();
router.use(authenticate);
router.use(requireManagement);

/**
 * @swagger
 * tags:
 *   name: Routes
 *   description: Quản lý tuyến đường
 */

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Lấy danh sách tuyến đường
 *     tags: [Routes]
 *     description: Lấy tất cả tuyến đường chưa bị xóa kèm số chuyến đi liên kết.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', requirePermission('manage_routes'), listRoutes);

/**
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Lấy chi tiết tuyến đường
 *     tags: [Routes]
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
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', validateRouteId, requirePermission('manage_routes'), getRouteById);

/**
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Thêm tuyến đường mới
 *     tags: [Routes]
 *     description: Tạo tuyến đường mới. Điểm đi và điểm đến phải khác nhau.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, start_point, end_point]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Đà Nẵng - Huế
 *               start_point:
 *                 type: string
 *                 example: Đà Nẵng - Quảng Nam
 *               end_point:
 *                 type: string
 *                 example: Thừa Thiên Huế - Quảng Trị
 *               distance:
 *                 type: number
 *                 example: 100
 *                 description: Cự ly (km)
 *               estimated_duration:
 *                 type: integer
 *                 example: 120
 *                 description: Thời gian ước tính (phút)
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Điểm đi trùng điểm đến
 *       409:
 *         description: Tên tuyến đã tồn tại
 */
router.post('/', validateCreateRoute, requirePermission('manage_routes'), createRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Cập nhật tuyến đường
 *     tags: [Routes]
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
 *               name:
 *                 type: string
 *               start_point:
 *                 type: string
 *               end_point:
 *                 type: string
 *               distance:
 *                 type: number
 *               estimated_duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', validateRouteId, validateUpdateRoute, requirePermission('manage_routes'), updateRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   delete:
 *     summary: Xóa tuyến đường (soft delete)
 *     tags: [Routes]
 *     description: Chỉ xóa được khi không còn chuyến đi scheduled/active.
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
 *         description: Còn chuyến đi đang hoạt động
 */
router.delete('/:id', validateRouteId, requirePermission('manage_routes'), deleteRoute);

export default router;