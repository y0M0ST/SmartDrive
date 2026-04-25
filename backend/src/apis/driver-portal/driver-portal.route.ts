import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as driverPortalController from './driver-portal.controller';
import {
    getMyTripsQuerySchema,
    saveFaceTemplateBodySchema,
    tripCheckinSchema,
} from './driver-portal.dto';

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

/**
 * @swagger
 * /api/driver/me/face-template:
 *   post:
 *     summary: Đăng ký / cập nhật mẫu khuôn mặt (Face ID)
 *     tags: [Driver Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [faceEncoding]
 *             properties:
 *               faceEncoding:
 *                 type: array
 *                 minItems: 128
 *                 maxItems: 128
 *                 items:
 *                   type: number
 *     responses:
 *       200:
 *         description: Đã lưu vector khuôn mặt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải DRIVER
 *       404:
 *         description: Không có hồ sơ tài xế
 */
router.post(
    '/me/face-template',
    validate(saveFaceTemplateBodySchema),
    driverPortalController.saveFaceTemplate,
);

/**
 * @swagger
 * /api/driver/me/face-template:
 *   get:
 *     summary: Lấy mẫu khuôn mặt đã đăng ký (để đối soát trên thiết bị)
 *     tags: [Driver Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về faceEncoding (mảng 128 số)
 *       404:
 *         description: Chưa đăng ký mẫu khuôn mặt
 */
router.get('/me/face-template', driverPortalController.getFaceTemplate);

/**
 * @swagger
 * /api/driver/me/trips/{tripId}/checkin:
 *   post:
 *     summary: Điểm danh lên xe (Face ID check-in)
 *     tags: [Driver Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
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
 *             required: [result, matchScore]
 *             properties:
 *               result:
 *                 type: string
 *                 enum: [SUCCESS, FAILED, LOCKED]
 *               matchScore:
 *                 type: number
 *     responses:
 *       200:
 *         description: SUCCESS — chuyến chuyển sang IN_PROGRESS
 *       400:
 *         description: FAILED / LOCKED hoặc chuyến không ở trạng thái SCHEDULED
 */
router.post(
    '/me/trips/:tripId/checkin',
    validate(tripCheckinSchema),
    driverPortalController.checkinTrip,
);

export default router;
