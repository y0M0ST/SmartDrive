import { Router } from 'express';
import { authenticate, requireManagementAccess, requireSuperAdmin } from '../../common/middlewares/auth.middleware';
import {
  createAgencyAccount,
  deleteAgencyAccount,
  listAgencyAccounts,
} from './agencyAccount.controller';
import {
  validateAgencyAccountId,
  validateCreateAgencyAccount,
} from './agencyAccount.validator';

const router = Router();

router.use(authenticate);
router.use(requireManagementAccess);

/**
 * @swagger
 * /api/agency-accounts:
 *   get:
 *     summary: Lay danh sach tai khoan dai ly
 *     tags: [AgencyAccounts]
 *     description: Super Admin xem toan bo tai khoan agency_manager. Agency Manager chi xem tai khoan trong dai ly cua minh.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lay danh sach tai khoan dai ly thanh cong
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
 *                   example: Lay danh sach tai khoan dai ly thanh cong
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AgencyAccountResponse'
 */
router.get('/', listAgencyAccounts);

/**
 * @swagger
 * /api/agency-accounts/agency/{id}:
 *   post:
 *     summary: Tao tai khoan quan ly cho dai ly
 *     tags: [AgencyAccounts]
 *     description: Chi Super Admin duoc tao tai khoan agency_manager cho dai ly. Truyen agency ID trong URL va email + password trong body.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 11111111-1111-1111-1111-111111111111
 *         description: ID dai ly can tao tai khoan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: manager@agency.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       201:
 *         description: Tao tai khoan quan ly dai ly thanh cong
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
 *                   example: Tao tai khoan quan ly dai ly thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/AgencyAccountResponse'
 *       404:
 *         description: Khong tim thay dai ly
 *       409:
 *         description: Dai ly tam ngung hoat dong hoac email da ton tai
 */
router.post('/agency/:id', requireSuperAdmin, validateCreateAgencyAccount, createAgencyAccount);

/**
 * @swagger
 * /api/agency-accounts/{id}:
 *   delete:
 *     summary: Xoa tai khoan dai ly
 *     tags: [AgencyAccounts]
 *     description: Chi Super Admin duoc xoa tai khoan agency_manager.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID tai khoan dai ly (admin ID)
 *     responses:
 *       200:
 *         description: Xoa tai khoan dai ly thanh cong
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
 *                   example: Xoa tai khoan dai ly thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/AgencyAccountDeleteResponse'
 *       404:
 *         description: Khong tim thay tai khoan dai ly
 */
router.delete('/:id', requireSuperAdmin, validateAgencyAccountId, deleteAgencyAccount);

export default router;
