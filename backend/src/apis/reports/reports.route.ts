import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { requireAgencyAdminOrDispatcher } from '../../middleware/agency-admin-dispatcher.middleware';
import * as reportsController from './reports.controller';
import { agencyReportQuerySchema } from './reports.dto';

const router = Router();

router.use(authMiddleware, requireAgencyAdminOrDispatcher);

/**
 * @swagger
 * tags:
 *   - name: Agency reports
 *     description: US_14 — Dashboard & xuất Excel (phạm vi nhà xe, không dành cho Super Admin)
 */

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Thống kê tổng hợp (chuyến hoàn thành, vi phạm AI, biểu đồ theo ngày)
 *     tags: [Agency reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-04-01"
 *         description: Ngày bắt đầu (YYYY-MM-DD, lịch VN)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-04-18"
 *         description: Ngày kết thúc (YYYY-MM-DD, inclusive)
 *       - in: query
 *         name: driverId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo tài xế (phải thuộc nhà xe)
 *       - in: query
 *         name: violationType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [DROWSY, DISTRACTED]
 *         description: Lọc theo loại vi phạm AI
 *     responses:
 *       200:
 *         description: Payload dashboard (summary + charts)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Sai định dạng ngày hoặc startDate sau endDate
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Super Admin hoặc không đủ quyền / thiếu agency_id
 */
router.get('/dashboard', validate(agencyReportQuerySchema), reportsController.getDashboard);

/**
 * @swagger
 * /api/reports/export-excel:
 *   get:
 *     summary: Xuất file Excel (.xlsx) theo cùng bộ lọc dashboard
 *     tags: [Agency reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: driverId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: violationType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [DROWSY, DISTRACTED]
 *     responses:
 *       200:
 *         description: File Excel (binary)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Không có chuyến hoàn thành và không có vi phạm trong khoảng thời gian
 *       400:
 *         description: Dữ liệu query không hợp lệ
 *       403:
 *         description: Super Admin hoặc không đủ quyền
 */
router.get('/export-excel', validate(agencyReportQuerySchema), reportsController.exportExcel);

export default router;
