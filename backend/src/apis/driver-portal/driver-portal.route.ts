import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as driverPortalController from './driver-portal.controller';
import { getMyTripsQuerySchema } from './driver-portal.dto';

const router = Router();

router.use(authMiddleware, requireRole(['DRIVER']));

/**
 * @swagger
 * tags:
 *   - name: Driver Portal
 *     description: Cổng tài xế — lịch trình & thao tác trên điện thoại
 */

/**
 * @swagger
 * /api/driver/me/trips:
 *   get:
 *     summary: Lịch trình chuyến đi của tài xế đang đăng nhập
 *     description: |
 *       Chỉ role **DRIVER**. `driver_id` luôn lấy từ JWT (`req.user.id`) — không nhận từ query/body (chống IDOR).
 *       Trả về tuyến, xe, nhà xe (kèm SĐT để liên hệ). Sắp xếp `departure_time` giảm dần.
 *     tags: [Driver Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải tài xế (DRIVER)
 */
router.get('/me/trips', validate(getMyTripsQuerySchema), driverPortalController.getMyTrips);

export default router;
