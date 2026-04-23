import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { requireAgencyAdminOrDispatcher } from '../../middleware/agency-admin-dispatcher.middleware';
import * as violationsInboxController from './violations-inbox.controller';
import { violationsUnreadQuerySchema, violationAcknowledgeParamSchema } from './violations-inbox.dto';

const router = Router();

router.use(authMiddleware, requireAgencyAdminOrDispatcher);

/**
 * @swagger
 * tags:
 *   - name: Violations inbox
 *     description: US_10 — Hộp thư vi phạm AI (AGENCY_ADMIN, DISPATCHER; Super Admin không dùng)
 */

/**
 * @swagger
 * /api/violations/unread:
 *   get:
 *     summary: Danh sách vi phạm AI chưa đọc (theo nhà xe trong JWT)
 *     description: |
 *       Trả về các `ai_violations` có `is_read = false`, thuộc chuyến của `agency_id` trong token.
 *       Sắp xếp `occurred_at` giảm dần. Giới hạn số bản ghi bằng query `limit` (mặc định 50).
 *     tags: [Violations inbox]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Số bản ghi tối đa trả về
 *     responses:
 *       200:
 *         description: Thành công (có thể mảng rỗng)
 *       400:
 *         description: Query không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc phiên hết hạn
 *       403:
 *         description: Super Admin hoặc không đủ quyền / thiếu agency_id
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/unread', validate(violationsUnreadQuerySchema), violationsInboxController.getUnreadViolations);

/**
 * @swagger
 * /api/violations/{id}/acknowledge:
 *   patch:
 *     summary: Đánh dấu đã xem / xác nhận một vi phạm (acknowledge)
 *     description: |
 *       Cập nhật `is_read`, `acknowledged_by`, `acknowledged_at` nếu vi phạm thuộc nhà xe của user.
 *     tags: [Violations inbox]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID bản ghi `ai_violations`
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: ID không phải UUID
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền hoặc vi phạm không thuộc nhà xe
 *       404:
 *         description: Không tìm thấy vi phạm
 *       500:
 *         description: Lỗi máy chủ
 */
router.patch(
    '/:id/acknowledge',
    validate(violationAcknowledgeParamSchema),
    violationsInboxController.acknowledgeViolation,
);

export default router;
