import { Router } from 'express';
import * as routeController from './route.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    changeRouteStatusSchema,
    createRouteSchema,
    getRouteQuerySchema,
    routeIdParamSchema,
    updateRouteSchema,
} from './route.dto';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Routes
 *     description: Danh mục tuyến đường (SUPER_ADMIN, AGENCY_ADMIN)
 */

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Danh sách tuyến (phân trang, tìm kiếm, lọc trạng thái)
 *     description: Query theo `getRouteQuerySchema` (page, limit, search, status).
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi mỗi trang
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Tìm theo tên tuyến
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Query không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi máy chủ
 *   post:
 *     summary: Tạo tuyến mới
 *     description: Body khớp `createRouteSchema` — mã điểm đầu/cuối lấy từ `GET /api/provinces`.
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - start_point
 *               - end_point
 *               - distance_km
 *               - estimated_hours
 *             properties:
 *               name:
 *                 type: string
 *                 example: Da Nang - Hue
 *               start_point:
 *                 type: string
 *                 description: Mã tỉnh/thành (GET /api/provinces)
 *                 example: DA_NANG
 *               end_point:
 *                 type: string
 *                 description: Mã tỉnh/thành (GET /api/provinces)
 *                 example: THUA_THIEN_HUE
 *               distance_km:
 *                 type: number
 *                 example: 102.5
 *               estimated_hours:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       201:
 *         description: Tạo tuyến thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       409:
 *         description: Trùng tuyến hoặc xung đột (nếu có)
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/', validate(getRouteQuerySchema), routeController.getRoutes);
router.post('/', validate(createRouteSchema), routeController.createRoute);

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Cập nhật thông tin tuyến
 *     description: Body khớp `updateRouteSchema` (các trường tùy chọn).
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
 *         description: UUID tuyến
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Da Nang - Hue (cao toc)
 *               start_point:
 *                 type: string
 *                 example: DA_NANG
 *               end_point:
 *                 type: string
 *                 example: THUA_THIEN_HUE
 *               distance_km:
 *                 type: number
 *                 example: 98.2
 *               estimated_hours:
 *                 type: number
 *                 example: 2.3
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy tuyến
 *       500:
 *         description: Lỗi máy chủ
 *   delete:
 *     summary: Xóa mềm tuyến
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
 *         description: UUID tuyến
 *     responses:
 *       200:
 *         description: Xóa mềm thành công
 *       400:
 *         description: Không thể xóa vì còn chuyến chưa chạy hoặc đang chạy
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy tuyến
 *       500:
 *         description: Lỗi máy chủ
 */
router.put('/:id', validate(routeIdParamSchema.merge(updateRouteSchema)), routeController.updateRoute);
router.delete('/:id', validate(routeIdParamSchema), routeController.deleteRoute);

/**
 * @swagger
 * /api/routes/{id}/status:
 *   patch:
 *     summary: Đổi trạng thái tuyến (ACTIVE / SUSPENDED)
 *     description: Body khớp `changeRouteStatusSchema`.
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
 *         description: UUID tuyến
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
 *                 enum: [ACTIVE, SUSPENDED]
 *                 example: SUSPENDED
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 *       400:
 *         description: Trạng thái không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy tuyến
 *       500:
 *         description: Lỗi máy chủ
 */
router.patch('/:id/status', validate(routeIdParamSchema.merge(changeRouteStatusSchema)), routeController.changeStatus);

export default router;