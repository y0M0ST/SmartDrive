import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../../common/middlewares/auth.middleware';
import {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from './admin.controller';
import {
  validateAdminId,
  validateListAdmins,
  validateCreateAdmin,
  validateUpdateAdmin,
} from './admin.validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/admins:
 *   get:
 *     summary: Lấy danh sách tài khoản admin
 *     tags: [Admins]
 *     description: |
 *       - **super_admin**: Xem toàn bộ danh sách, lọc được theo role, agency_id, is_active.
 *       - **agency_manager**: Chỉ thấy chính mình (trả về 1 bản ghi).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo họ tên hoặc email
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [super_admin, agency_manager] }
 *         description: Chỉ super_admin được lọc theo role
 *       - in: query
 *         name: agency_id
 *         schema: { type: string, format: uuid }
 *         description: Chỉ super_admin được lọc theo đại lý
 *       - in: query
 *         name: is_active
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', validateListAdmins, listAdmins);

/**
 * @swagger
 * /api/admins/{id}:
 *   get:
 *     summary: Lấy chi tiết một tài khoản
 *     tags: [Admins]
 *     description: agency_manager chỉ được xem chính mình.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       403:
 *         description: Không có quyền xem tài khoản này
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.get('/:id', validateAdminId, getAdminById);

/**
 * @swagger
 * /api/admins:
 *   post:
 *     summary: Tạo tài khoản admin mới
 *     tags: [Admins]
 *     description: |
 *       Chỉ **super_admin** được tạo tài khoản mới.
 *       - Tạo `agency_manager`: bắt buộc có `agency_id` trỏ đến agency đang active.
 * 
 *       - Tạo `super_admin`: không được có `agency_id`.
 * 
 *       - Nếu không truyền `password`, hệ thống dùng mật khẩu mặc định `SmartDrive@2026`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, full_name, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: manager@agency01.vn
 *               full_name:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               role:
 *                 type: string
 *                 enum: [super_admin, agency_manager]
 *               agency_id:
 *                 type: string
 *                 format: uuid
 *                 description: Bắt buộc với agency_manager
 *               password:
 *                 type: string
 *                 description: Mặc định SmartDrive@2026 nếu không truyền
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       403:
 *         description: Không có quyền (agency_manager không được tạo tài khoản)
 */
router.post('/', requireSuperAdmin, validateCreateAdmin, createAdmin);

/**
 * @swagger
 * /api/admins/{id}:
 *   put:
 *     summary: Cập nhật tài khoản admin
 *     tags: [Admins]
 *     description: |
 *       - **super_admin**: Cập nhật được mọi tài khoản. Không thể tự đổi role hoặc tự khóa mình.
 *       - **agency_manager**: Chỉ cập nhật được `full_name` của chính mình.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:     { type: string, format: email }
 *               full_name: { type: string }
 *               role:      { type: string, enum: [super_admin, agency_manager] }
 *               agency_id: { type: string, format: uuid }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.put('/:id', validateAdminId, validateUpdateAdmin, updateAdmin);

/**
 * @swagger
 * /api/admins/{id}:
 *   delete:
 *     summary: Xóa tài khoản admin
 *     tags: [Admins]
 *     description: |
 *       Chỉ **super_admin** được xóa. Không thể tự xóa chính mình.
 *       Nếu tài khoản có dữ liệu liên kết (drivers, violations, v.v.) sẽ bị chặn.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy tài khoản
 *       409:
 *         description: Không thể xóa (tự xóa mình hoặc có dữ liệu liên kết)
 */
router.delete('/:id', requireSuperAdmin, validateAdminId, deleteAdmin);

export default router;