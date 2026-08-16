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
 *     description: Quản lý tài khoản người dùng (SUPER_ADMIN, AGENCY_ADMIN)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Danh sách người dùng (phân trang, tìm kiếm, lọc)
 *     description: |
 *       `page` / `limit` / `search` / `agency_id` / `role_id` / `status` là query string (Zod).
 *       Phạm vi dữ liệu theo vai trò (ví dụ agency admin thường chỉ thấy user thuộc nhà xe của mình).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Số trang (chuỗi số, mặc định 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Kích thước trang (chuỗi số, mặc định 10)
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Tìm theo họ tên hoặc email
 *       - in: query
 *         name: agency_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo nhà xe (thường dùng bởi super admin)
 *       - in: query
 *         name: role_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID vai trò
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, BLOCKED, INACTIVE]
 *         description: Lọc theo trạng thái tài khoản
 *     responses:
 *       200:
 *         description: Thành công — danh sách + meta phân trang
 *       400:
 *         description: Query không hợp lệ (Zod)
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không đủ quyền (không phải SUPER_ADMIN / AGENCY_ADMIN)
 *       500:
 *         description: Lỗi máy chủ
 *
 *   post:
 *     summary: Tạo tài khoản người dùng mới
 *     description: |
 *       Body khớp `createUserSchema`: `agency_id` có thể null cho super admin; tài khoản thuộc nhà xe thường cần `agency_id` hợp lệ (theo nghiệp vụ service).
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
 *                 minLength: 1
 *                 example: "Nguyễn Văn A"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "driver01.smartdrive@gmail.com"
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 example: "0988123456"
 *               role_id:
 *                 type: string
 *                 format: uuid
 *                 example: "d19b49b8-3e4b-4b15-9c88-e21b0b5c1234"
 *               agency_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID nhà xe hoặc null (super admin)
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc vi phạm nghiệp vụ (Zod / service)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 *       409:
 *         description: Trùng email/SĐT hoặc xung đột dữ liệu (nếu có)
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/', validate(getUserQuerySchema), userController.getUsers);
router.post('/', validate(createUserSchema), userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật thông tin tài khoản (một hoặc nhiều trường)
 *     description: |
 *       Body khớp `updateUserSchema`: mọi trường optional; `email` phải đúng format; `phone` tối thiểu 10 ký tự nếu gửi.
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
 *         description: UUID người dùng cần sửa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Nguyễn Văn Đã Đổi Tên"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "doiten@gmail.com"
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 example: "0912345678"
 *               role_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không được phép sửa user này
 *       404:
 *         description: Không tìm thấy người dùng
 *       409:
 *         description: Trùng email/SĐT (nếu có)
 *       500:
 *         description: Lỗi máy chủ
 *
 *   delete:
 *     summary: Xóa mềm tài khoản
 *     description: Có thể từ chối nếu tài xế đang có chuyến active (theo service).
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
 *         description: UUID người dùng cần xóa
 *     responses:
 *       200:
 *         description: Xóa mềm thành công
 *       400:
 *         description: Không thể xóa (ràng buộc nghiệp vụ, ví dụ tài xế đang có chuyến)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi máy chủ
 */
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Khóa hoặc mở khóa tài khoản (đổi trạng thái)
 *     description: Body khớp `changeStatusSchema` — enum `ACTIVE` | `INACTIVE` | `BLOCKED`.
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
 *         description: UUID người dùng
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
 *       400:
 *         description: Payload không hợp lệ hoặc chuyển trạng thái không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi máy chủ
 */
router.patch('/:id/status', validate(changeStatusSchema), userController.changeStatus);

export default router;