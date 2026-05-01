import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as agencyController from './agency.controller';
import {
    changeAgencyStatusSchema,
    createAgencySchema,
    getAgencyQuerySchema,
    updateAgencySchema,
} from './agency.dto';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Agencies
 *     description: Quản lý thông tin Nhà xe (Agency)
 */

/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Lấy danh sách nhà xe
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', validate(getAgencyQuerySchema), agencyController.getAgencies);

/**
 * @swagger
 * /api/agencies:
 *   post:
 *     summary: Tạo nhà xe mới (Chỉ dành cho SUPER_ADMIN)
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name]
 *             properties:
 *               code:
 *                 type: string
 *                 example: AGENCY_11
 *               name:
 *                 type: string
 *                 example: Nhà xe Phương Trang
 *               address:
 *                 type: string
 *                 example: 123 Lê Duẩn, Đà Nẵng
 *               phone:
 *                 type: string
 *                 example: "0900000111"
 *     responses:
 *       201:
 *         description: Tạo nhà xe thành công
 */
router.post('/', validate(createAgencySchema), agencyController.createAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   put:
 *     summary: Cập nhật thông tin nhà xe
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nhà xe Phương Trang (Update)
 *               address:
 *                 type: string
 *                 example: 456 Hoàng Diệu, Đà Nẵng
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin thành công
 */
router.put('/:id', validate(updateAgencySchema), agencyController.updateAgency);

/**
 * @swagger
 * /api/agencies/{id}/status:
 *   patch:
 *     summary: Thay đổi trạng thái nhà xe (Khóa/Mở khóa)
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: "INACTIVE"
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 */
router.patch(
    '/:id/status',
    validate(changeAgencyStatusSchema),
    agencyController.changeAgencyStatus,
);

export default router;