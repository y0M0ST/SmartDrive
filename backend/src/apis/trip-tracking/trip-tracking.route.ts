import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAgencyTrackingAccess } from './trip-tracking.middleware';
import * as tripTrackingController from './trip-tracking.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Trip tracking
 *     description: US_09 — Bản đồ giám sát (agency scope)
 */

/**
 * @swagger
 * /api/trips/active-tracking:
 *   get:
 *     summary: Danh sách chuyến IN_PROGRESS và điểm GPS mới nhất (bản đồ giám sát)
 *     description: |
 *       US_09 — Chỉ **AGENCY_ADMIN** và **DISPATCHER** có `agency_id`. Trả về các chuyến đang chạy của nhà xe
 *       kèm tọa độ/speed/heading mới nhất từ `gps_logs` (nếu có).
 *     tags: [Trip tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công (có thể mảng rỗng nếu không có chuyến đang chạy)
 *       401:
 *         description: Chưa đăng nhập hoặc phiên không hợp lệ
 *       403:
 *         description: Super Admin hoặc role không được phép / thiếu agency_id
 *       500:
 *         description: Lỗi máy chủ
 */
router.get(
    '/active-tracking',
    authMiddleware,
    requireAgencyTrackingAccess,
    tripTrackingController.getActiveTracking,
);

export default router;
