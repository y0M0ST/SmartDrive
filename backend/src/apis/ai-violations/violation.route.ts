import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as violationController from './violation.controller';
import { getAgencyViolationsQuerySchema } from './violation.dto';

const router = Router();

router.use(authMiddleware, requireRole(['AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: AI Violations
 *     description: Lịch sử vi phạm AI theo nhà xe (Agency Admin)
 */

/**
 * @swagger
 * /api/agencies/violations:
 *   get:
 *     summary: Danh sách vi phạm AI của nhà xe (join Trip, Route, Vehicle, Driver)
 *     description: |
 *       Luôn giới hạn theo `trip.agency_id` trong JWT. Không gửi `startDate`/`endDate` → mặc định **hôm nay theo lịch Asia/Ho_Chi_Minh**, sắp xếp `occurred_at` giảm dần.
 *       Gửi `startDate` và `endDate` phải cùng lúc (`YYYY-MM-DD` hoặc datetime hợp lệ — quy đổi theo lịch VN); kiểm tra `startDate` ≤ `endDate`.
 *     tags: [AI Violations]
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
 *       - in: query
 *         name: startDate
 *         description: ISO date hoặc datetime (bắt buộc kèm endDate)
 *         schema:
 *           type: string
 *           example: "2026-04-17"
 *       - in: query
 *         name: endDate
 *         description: ISO date hoặc datetime (bắt buộc kèm startDate)
 *         schema:
 *           type: string
 *           example: "2026-04-17"
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DROWSY, DISTRACTED]
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Query không hợp lệ (khoảng ngày, phân trang)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền (chỉ AGENCY_ADMIN)
 */
router.get('/', validate(getAgencyViolationsQuerySchema), violationController.getAgencyViolations);

/**
 * @swagger
 * /api/agencies/violations/unread-count:
 *   get:
 *     summary: Số vi phạm AI chưa đọc — dùng cho badge chuông topbar (US_10)
 *     description: |
 *       Trả về `count` (tối đa 99) và `capped` (true nếu thực tế > 99).
 *       Chỉ tính các vi phạm `is_read = false` thuộc chuyến của nhà xe trong JWT.
 *     tags: [AI Violations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ count: number, capped: boolean }"
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 */
router.get('/unread-count', violationController.getUnreadCount);

/**
 * @swagger
 * /api/agencies/violations/{id}/acknowledge:
 *   patch:
 *     summary: Đánh dấu đã xem vi phạm AI (US_10)
 *     description: |
 *       Set `is_read = true`, ghi `acknowledged_by` (user JWT) và `acknowledged_at`.
 *       Vi phạm phải thuộc nhà xe trong JWT — sai agency trả 404.
 *     tags: [AI Violations]
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
 *         description: Acknowledge thành công — trả về is_read, acknowledged_by, acknowledged_at
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 *       404:
 *         description: Không tìm thấy vi phạm hoặc không thuộc nhà xe
 */
router.patch('/:id/acknowledge', violationController.acknowledgeViolation);

export default router;
