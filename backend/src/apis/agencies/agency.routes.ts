import { Router } from 'express';
import { authenticate, requireManagementAccess, requireSuperAdmin } from '../../common/middlewares/auth.middleware';
import {
  createAgency,
  deleteAgency,
  getAgencyById,
  listAgencies,
  updateAgency,
} from './agency.controller';
import {
  validateAgencyId,
  validateCreateAgency,
  validateUpdateAgency,
} from './agency.validator';

const router = Router();

router.use(authenticate);
router.use(requireManagementAccess);

/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Lấy danh sách đại lý
 *     tags: [Agencies]
 *     description: Super Admin xem toàn bộ đại lý kèm danh sách managers. Agency Manager chỉ xem đại lý của mình.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách đại lý thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách đại lý thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AgencyResponse'
 */
router.get('/', listAgencies);

/**
 * @swagger
 * /api/agencies/{id}:
 *   get:
 *     summary: Lấy chi tiết đại lý
 *     tags: [Agencies]
 *     description: Super Admin xem được tất cả. Agency Manager chỉ xem được đại lý của mình. Response bao gồm danh sách managers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID đại lý
 *     responses:
 *       200:
 *         description: Lấy thông tin đại lý thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lấy thông tin đại lý thành công
 *                 data:
 *                   $ref: '#/components/schemas/AgencyResponse'
 *       403:
 *         description: Không có quyền xem đại lý này
 *       404:
 *         description: Không tìm thấy đại lý
 */
router.get('/:id', validateAgencyId, getAgencyById);

/**
 * @swagger
 * /api/agencies:
 *   post:
 *     summary: Thêm đại lý mới
 *     tags: [Agencies]
 *     description: Chỉ Super Admin được tạo mới đại lý.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgencyPayload'
 *     responses:
 *       201:
 *         description: Thêm đại lý thành công
 *       409:
 *         description: Mã hoặc tên đại lý đã tồn tại
 */
router.post('/', requireSuperAdmin, validateCreateAgency, createAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   put:
 *     summary: Cập nhật đại lý
 *     tags: [Agencies]
 *     description: Chỉ Super Admin được sửa thông tin đại lý.
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
 *             $ref: '#/components/schemas/AgencyPayload'
 *     responses:
 *       200:
 *         description: Cập nhật đại lý thành công
 *       404:
 *         description: Không tìm thấy đại lý
 *       409:
 *         description: Mã hoặc tên đại lý đã tồn tại
 */
router.put('/:id', requireSuperAdmin, validateAgencyId, validateUpdateAgency, updateAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   delete:
 *     summary: Xóa đại lý
 *     tags: [Agencies]
 *     description: Chỉ Super Admin được xóa đại lý. Đại lý chỉ được xóa khi không còn tài khoản, tài xế, phương tiện liên kết.
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
 *         description: Xóa đại lý thành công
 *       404:
 *         description: Không tìm thấy đại lý
 *       409:
 *         description: Đại lý vẫn còn dữ liệu liên kết
 */
router.delete('/:id', requireSuperAdmin, validateAgencyId, deleteAgency);

export default router;