import { Router } from 'express';
import * as userController from './user.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  changeStatusSchema,
  createUserSchema,
  getUserQuerySchema,
  updateUserSchema,
} from './user.dto';

const router = Router();

// Áp dụng middleware kiểm tra đăng nhập và quyền quản trị
router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Quản lý tài khoản người dùng (Admin)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users with pagination and filters
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Current page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name or email
 *       - in: query
 *         name: agency_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional for super admin only
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by role id
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, BLOCKED, INACTIVE]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Success
 *
 *   post:
 *     summary: Create a new user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - phone
 *               - role_id
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Nguyen Van A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: phucnguyen2812cuwin+driver01@gmail.com
 *               phone:
 *                 type: string
 *                 example: "0988123456"
 *               role_id:
 *                 type: string
 *                 format: uuid
 *                 example: d19b49b8-3e4b-4b15-9c88-e21b0b5c1234
 *               agency_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Required for non-super-admin accounts
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation or business error
 */
router.get('/', validate(getUserQuerySchema), userController.getUsers);
router.post('/', validate(createUserSchema), userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật thông tin tài khoản
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng cần sửa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn Đã Đổi Tên"
 *               email:
 *                 type: string
 *                 example: "doiten@gmail.com"
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *               role_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *
 *   delete:
 *     summary: Xóa mềm tài khoản
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng cần xóa
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công
 *       400:
 *         description: Không thể xóa tài xế đang có chuyến (Ràng buộc logic)
 */
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Khóa hoặc mở khóa tài khoản
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BLOCKED]
 *                 example: "BLOCKED"
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 */
router.patch('/:id/status', validate(changeStatusSchema), userController.changeStatus);

export default router;