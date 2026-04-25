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

export default router;
