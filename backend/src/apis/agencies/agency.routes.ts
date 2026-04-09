import { Router } from 'express';
import { authenticate, requireManagement, requirePermission, requireSuperAdmin } from '../../common/middlewares/auth.middleware';
import { createAgency, deleteAgency, getAgencyById, listAgencies, updateAgency } from './agency.controller';
import { validateAgencyId, validateCreateAgency, validateUpdateAgency } from './agency.validator';

const router = Router();
router.use(authenticate);
router.use(requireManagement);

/**
 * @swagger
 * tags:
 *   name: Agencies
 *   description: Quản lý đại lý nhà xe
 */

/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Lấy danh sách đại lý
 *     tags: [Agencies]
 *     description: Super Admin xem tất cả. Agency Manager chỉ xem đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', listAgencies);

/**
 * @swagger
 * /api/agencies/{id}:
 *   get:
 *     summary: Lấy chi tiết đại lý
 *     tags: [Agencies]
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
 *         description: Thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', validateAgencyId, getAgencyById);

/**
 * @swagger
 * /api/agencies:
 *   post:
 *     summary: Tạo đại lý mới
 *     tags: [Agencies]
 *     description: Chỉ Super Admin được tạo đại lý mới.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nhà xe Huế
 *               address:
 *                 type: string
 *                 example: 123 Lê Lợi, Huế
 *               phone:
 *                 type: string
 *                 example: "0905123456"
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID tài khoản quản lý đại lý
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       409:
 *         description: Tên đại lý đã tồn tại
 */
router.post('/', requireSuperAdmin, validateCreateAgency, createAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   put:
 *     summary: Cập nhật đại lý
 *     tags: [Agencies]
 *     description: Chỉ Super Admin được cập nhật.
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
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', requireSuperAdmin, validateAgencyId, validateUpdateAgency, updateAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   delete:
 *     summary: Xóa đại lý
 *     tags: [Agencies]
 *     description: Chỉ Super Admin. Chỉ xóa được khi không còn tài xế/xe liên kết.
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
 *       409:
 *         description: Còn dữ liệu liên kết
 */
router.delete('/:id', requireSuperAdmin, validateAgencyId, deleteAgency);

export default router;