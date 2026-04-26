import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as driverPortalController from './driver-portal.controller';
import {
    driverStatisticsQuerySchema,
    driverViolationsQuerySchema,
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
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/me/trips', validate(getMyTripsQuerySchema), driverPortalController.getMyTrips);

/**
 * @swagger
 * /api/driver/violations:
 *   get:
 *     summary: Lịch sử vi phạm AI của tài xế đang đăng nhập (US_16)
 *     description: |
 *       **Chỉ role DRIVER.** `driver_id` luôn lấy từ JWT (`req.user.id`) — không có query `driverId` (chống IDOR).
 *       Lọc theo tháng lịch Việt Nam (`month=YYYY-MM`), tùy chọn `tripCode` (mã chuyến chính xác), phân trang `page` / `limit`.
 *       Không có bản ghi: trả `data: []`, `meta.total: 0` (HTTP 200).
 *     tags: [Driver Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}-\\d{2}$'
 *           example: "2026-04"
 *         description: Tháng theo lịch VN (YYYY-MM)
 *       - in: query
 *         name: tripCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Lọc theo mã chuyến (khớp chính xác)
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
 *         description: Thành công — `data` + `meta` (total, page, limit, totalPages)
 *       400:
 *         description: month/query không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải DRIVER
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/violations', validate(driverViolationsQuerySchema), driverPortalController.getMyViolations);
/** Cùng handler với `/violations` — khớp quy ước `/me/*` như lịch trình tài xế. */
router.get('/me/violations', validate(driverViolationsQuerySchema), driverPortalController.getMyViolations);

/**
 * @swagger
 * /api/driver/statistics:
 *   get:
 *     summary: Thống kê điểm an toàn & thu nhập dự kiến (US_17)
 *     description: |
 *       **Chỉ role DRIVER.** Mọi số liệu gắn với `req.user.id` (JWT) — không nhận `driverId` từ client (chống IDOR).
 *
 *       **Query `month`:** `YYYY-MM` theo lịch VN. Bỏ trống = tháng hiện tại (VN).
 *
 *       **Thu nhập tháng (cards):** lấy `base_salary`, `bonus_per_trip`, `penalty_per_point` từ bảng `salary_configs`
 *       của nhà xe (`users.agency_id`). Công thức:
 *       `monthly_estimated_income_vnd = max(0, base + completed_trips * bonus - total_deducted_points * penalty)`.
 *       `total_deducted_points` ưu tiên từ `driver_scores` (tháng đó), nếu chưa có bản ghi thì cộng từ `ai_violations` + `violation_configs`.
 *       `violations_drowsy_in_month` / `violations_distracted_in_month` đếm từ `ai_violations`; `total_violations_in_month` ưu tiên `driver_scores` nếu có.
 *
 *       **Biểu đồ theo tuần:** tháng được chia thành các khúc 7 ngày liên tiếp từ ngày 1 (tuần cuối có thể ngắn hơn).
 *       - `charts.safety_score_by_week[].score` = `max(0, 100 - tổng điểm trừ vi phạm trong tuần)` (xu hướng theo vi phạm).
 *       - `charts.estimated_income_by_week[].estimated_income_vnd` = `max(0, phần lương cứng chia đều tuần + chuyến*bonus - điểm*penalty)` trong phạm vi tuần (để vẽ cột/stack; tổng các tuần có thể lệch vài đồng do làm tròn phần lương cứng).
 *
 *       **Rỗng / thiếu cấu hình:** `salary_configured: false` → thu nhập = 0, các hệ số lương `null`; biểu đồ vẫn trả đủ số tuần (0 hoặc điểm 100).
 *     tags: [Driver Portal]
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
 *     responses:
 *       200:
 *         description: |
 *           `data.cards` — chỉ số tổng quan tháng.
 *           `data.charts` — mảng theo tuần cho biểu đồ.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     cards:
 *                       type: object
 *                       properties:
 *                         evaluation_month:
 *                           type: string
 *                           example: "2026-04"
 *                         salary_configured:
 *                           type: boolean
 *                         base_salary_vnd:
 *                           type: integer
 *                           nullable: true
 *                         bonus_per_trip_vnd:
 *                           type: integer
 *                           nullable: true
 *                         penalty_per_point_vnd:
 *                           type: integer
 *                           nullable: true
 *                         completed_trips:
 *                           type: integer
 *                         total_deducted_points:
 *                           type: integer
 *                         total_violations_in_month:
 *                           type: integer
 *                           nullable: true
 *                         final_safety_score:
 *                           type: integer
 *                           nullable: true
 *                           description: Từ driver_scores tháng (nếu có)
 *                         monthly_estimated_income_vnd:
 *                           type: integer
 *                     charts:
 *                       type: object
 *                       properties:
 *                         safety_score_by_week:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               week_index:
 *                                 type: integer
 *                               label:
 *                                 type: string
 *                               score:
 *                                 type: integer
 *                               deducted_points:
 *                                 type: integer
 *                               trips_completed:
 *                                 type: integer
 *                         estimated_income_by_week:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               week_index:
 *                                 type: integer
 *                               label:
 *                                 type: string
 *                               estimated_income_vnd:
 *                                 type: integer
 *                               trips_completed:
 *                                 type: integer
 *                               deducted_points:
 *                                 type: integer
 *                               base_salary_portion_vnd:
 *                                 type: integer
 *       400:
 *         description: month không đúng định dạng
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải DRIVER
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/statistics', validate(driverStatisticsQuerySchema), driverPortalController.getDriverStatistics);
/** Cùng handler với `/statistics` — khớp US_17 (`/api/driver/me/statistics`). */
router.get('/me/statistics', validate(driverStatisticsQuerySchema), driverPortalController.getDriverStatistics);

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
 *       400:
 *         description: Mảng faceEncoding không đúng 128 phần tử
 *       500:
 *         description: Lỗi máy chủ
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
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải DRIVER
 *       500:
 *         description: Lỗi máy chủ
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
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải DRIVER hoặc chuyến không thuộc tài xế
 *       404:
 *         description: Không tìm thấy chuyến
 *       500:
 *         description: Lỗi máy chủ
 */
router.post(
    '/me/trips/:tripId/checkin',
    validate(tripCheckinSchema),
    driverPortalController.checkinTrip,
);

export default router;
