import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import * as roleController from './role.controller';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Danh mục vai trò hệ thống (đọc — dành cho quản trị)
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Danh sách vai trò (roles)
 *     description: |
 *       Chỉ **SUPER_ADMIN** và **AGENCY_ADMIN** (middleware route). Dùng để điền dropdown khi tạo/sửa user.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công — mảng role
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không đủ quyền
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/', roleController.getRoles);

export default router;

