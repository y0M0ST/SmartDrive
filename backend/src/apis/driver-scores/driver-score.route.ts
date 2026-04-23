import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { requireAgencyAdminOrDispatcher } from '../../middleware/agency-admin-dispatcher.middleware';
import * as driverScoreController from './driver-score.controller';
import { leaderboardQuerySchema, driverHistoryParamSchema } from './driver-score.dto';

const router = Router();

router.use(authMiddleware, requireAgencyAdminOrDispatcher);

/**
 * @swagger
 * tags:
 *   - name: Driver scores
 *     description: US_13 — Điểm an toàn & BXH (AGENCY_ADMIN, DISPATCHER; Super Admin 403)
 */

/**
 * @swagger
 * /api/scores/leaderboard:
 *   get:
 *     summary: Bảng xếp hạng điểm an toàn theo tháng (phạm vi nhà xe)
 *     description: |
 *       Trả về tất cả tài xế DRIVER của `agency_id` trong JWT; tài xế chưa có `driver_scores` trong tháng
 *       sẽ có `final_score` = null. Sắp xếp theo `sort` (mặc định `desc` = điểm cao trước).
 *     tags: [Driver scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}-\\d{2}$'
 *           example: "2026-04"
 *         description: Tháng đánh giá theo lịch VN (YYYY-MM); bỏ trống = tháng hiện tại VN
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: asc = điểm thấp trước (cần chú ý), desc = điểm cao trước (an toàn hơn)
 *     responses:
 *       200:
 *         description: Thành công (ServiceResponse + data.entries)
 *       400:
 *         description: Query không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Super Admin hoặc không đủ quyền / thiếu agency_id
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/leaderboard', validate(leaderboardQuerySchema), driverScoreController.getLeaderboard);

/**
 * @swagger
 * /api/scores/driver/{driverId}/history:
 *   get:
 *     summary: Lịch sử vi phạm AI của một tài xế trong tháng (cho admin nhà xe)
 *     description: |
 *       `driverId` phải là tài xế thuộc cùng `agency_id`. Dùng để đối chiếu điểm trừ với từng vi phạm.
 *     tags: [Driver scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}-\\d{2}$'
 *           example: "2026-04"
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 *       404:
 *         description: Không tìm thấy tài xế hoặc không thuộc nhà xe
 *       500:
 *         description: Lỗi máy chủ
 */
router.get(
    '/driver/:driverId/history',
    validate(driverHistoryParamSchema),
    driverScoreController.getDriverHistory,
);

export default router;
