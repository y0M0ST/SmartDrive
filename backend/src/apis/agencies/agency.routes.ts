import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../../common/middlewares/auth.middleware';
import {
	createAgency,
	deleteAgency,
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

/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Lay danh sach dai ly
 *     tags: [Agencies]
 *     description: Super Admin xem toan bo dai ly. Agency Manager chi xem dai ly cua minh.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sach dai ly
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
 *                   example: Lay danh sach dai ly thanh cong
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AgencyResponse'
 */
router.get('/', listAgencies);

/**
 * @swagger
 * /api/agencies:
 *   post:
 *     summary: Them dai ly moi
 *     tags: [Agencies]
 *     description: Chi Super Admin duoc tao moi dai ly.
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
 *         description: Them dai ly thanh cong
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
 *                   example: Them dai ly thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/AgencyResponse'
 */
router.post('/', requireSuperAdmin, validateCreateAgency, createAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   put:
 *     summary: Cap nhat dai ly
 *     tags: [Agencies]
 *     description: Chi Super Admin duoc sua thong tin dai ly.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 11111111-1111-1111-1111-111111111111
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgencyPayload'
 *     responses:
 *       200:
 *         description: Cap nhat dai ly thanh cong
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
 *                   example: Cap nhat dai ly thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/AgencyResponse'
 */
router.put('/:id', requireSuperAdmin, validateAgencyId, validateUpdateAgency, updateAgency);

/**
 * @swagger
 * /api/agencies/{id}:
 *   delete:
 *     summary: Xoa dai ly
 *     tags: [Agencies]
 *     description: Chi Super Admin duoc xoa dai ly. Dai ly chi duoc xoa khi khong con admin, tai xe, phuong tien lien ket.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 11111111-1111-1111-1111-111111111111
 *     responses:
 *       200:
 *         description: Xoa dai ly thanh cong
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
 *                   example: Xoa dai ly thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/AgencyDeleteResponse'
 */
router.delete('/:id', requireSuperAdmin, validateAgencyId, deleteAgency);

export default router;