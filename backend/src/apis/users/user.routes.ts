import { Router } from 'express';
import { authenticate, requireManagement, requirePermission } from '../../common/middlewares/auth.middleware';
import { createUser, deleteUser, listUsers, updateUser } from './user.controller';
import { validateCreateUser, validateUpdateUser, validateUserId } from './user.validator';

const router = Router();
router.use(authenticate);
router.use(requireManagement);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý tài khoản người dùng
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách tài khoản
 *     tags: [Users]
 *     description: Super Admin xem tất cả. Agency Manager chỉ xem tài khoản trong đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', requirePermission('manage_users'), listUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo tài khoản mới
 *     tags: [Users]
 *     description: Tạo tài khoản cho agency_manager hoặc driver. Mật khẩu phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, role]
 *             properties:
 *               username:
 *                 type: string
 *                 example: manager_hue
 *               email:
 *                 type: string
 *                 example: manager@hue.vn
 *               password:
 *                 type: string
 *                 example: Manager@123
 *               role:
 *                 type: string
 *                 enum: [agency_manager, driver]
 *                 example: agency_manager
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       409:
 *         description: Email hoặc username đã tồn tại
 */
router.post('/', requirePermission('manage_users'), validateCreateUser, createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật tài khoản
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, banned]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', validateUserId, validateUpdateUser, requirePermission('manage_users'), updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Xóa tài khoản (soft delete)
 *     tags: [Users]
 *     description: Không thể xóa Super Admin hoặc tự xóa chính mình.
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
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền xóa
 *       404:
 *         description: Không tìm thấy
 */
router.delete('/:id', validateUserId, requirePermission('manage_users'), deleteUser);

export default router;