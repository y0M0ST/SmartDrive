import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as tripController from './trip.controller';
import {
    availableSlotQuerySchema,
    createTripSchema,
    getTripQuerySchema,
    tripIdParamSchema,
} from './trip.dto';

const router = Router();

router.use(authMiddleware, requireRole(['AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Trips
 *     description: Quản lý chuyến đi (Trip) — Agency Admin
 */

/**
 * @swagger
 * /api/agencies/trips:
 *   get:
 *     summary: Danh sách chuyến đi của nhà xe (kèm tuyến, xe, tài xế)
 *     tags: [Trips]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 */

/**
 * @swagger
 * /api/agencies/trips/available-drivers:
 *   get:
 *     summary: Tài xế không trùng lịch trong khoảng thời gian
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departure_time
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: planned_end_time
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Danh sách tài xế khả dụng
 *       400:
 *         description: Query không hợp lệ
 */

/**
 * @swagger
 * /api/agencies/trips/available-vehicles:
 *   get:
 *     summary: Xe (không bảo dưỡng) không trùng lịch trong khoảng thời gian
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departure_time
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: planned_end_time
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Danh sách xe khả dụng
 *       400:
 *         description: Query không hợp lệ
 */

/**
 * @swagger
 * /api/agencies/trips/{id}:
 *   get:
 *     summary: Chi tiết chuyến đi (tuyến, xe, tài xế, vi phạm AI)
 *     description: |
 *       Chỉ trả về nếu `trip.agency_id` khớp `agency_id` trong JWT. Sai nhà xe → 403; không tồn tại → 404.
 *       `ai_violations` sắp xếp `occurred_at` giảm dần.
 *     tags: [Trips]
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
 *       400:
 *         description: ID không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chuyến không thuộc nhà xe của bạn
 *       404:
 *         description: Không tìm thấy chuyến
 */

/**
 * @swagger
 * /api/agencies/trips:
 *   post:
 *     summary: Lập chuyến đi mới (tuyến + xe + tài xế + giờ xuất bến)
 *     description: |
 *       `agency_id` lấy từ JWT, không nhận từ body.
 *       Kiểm tra xe không bảo dưỡng và không trùng lịch tài xế/xe với chuyến SCHEDULED/IN_PROGRESS.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_id
 *               - vehicle_id
 *               - driver_id
 *               - departure_time
 *             properties:
 *               route_id:
 *                 type: string
 *                 format: uuid
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *               driver_id:
 *                 type: string
 *                 format: uuid
 *               departure_time:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian xuất bến dự kiến (ISO 8601)
 *     responses:
 *       201:
 *         description: Tạo chuyến thành công
 *       400:
 *         description: Dữ liệu không hợp lệ (VD xe bảo dưỡng, user không phải tài xế, giờ quá khứ)
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không đủ quyền (chỉ AGENCY_ADMIN)
 *       404:
 *         description: Không tìm thấy tuyến/xe/tài xế hoặc không thuộc nhà xe
 *       409:
 *         description: Trùng lịch tài xế hoặc xe
 */
router.get(
    '/available-drivers',
    validate(availableSlotQuerySchema),
    tripController.getAvailableDrivers,
);
router.get(
    '/available-vehicles',
    validate(availableSlotQuerySchema),
    tripController.getAvailableVehicles,
);
router.get('/', validate(getTripQuerySchema), tripController.getTrips);
router.post('/', validate(createTripSchema), tripController.createTrip);
router.get('/:id', validate(tripIdParamSchema), tripController.getTripDetail);

export default router;
