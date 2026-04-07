import { Router } from 'express';
import { authenticate, requireManagementAccess } from '../../common/middlewares/auth.middleware';
import {
  createDriverAccount,
  deleteDriverAccount,
  listDriverAccounts,
  resetDriverAccountPassword,
  updateDriverAccount,
} from './driverAccount.controller';
import {
  validateCreateDriverAccount,
  validateDriverAccountId,
  validateListDriverAccounts,
  validateResetDriverAccountPassword,
  validateUpdateDriverAccount,
} from './driverAccount.validator';

const router = Router();

router.use(authenticate);
router.use(requireManagementAccess);

/**
 * @swagger
 * /api/driver-accounts:
 *   get:
 *     summary: Lay danh sach tai khoan tai xe
 *     tags: [DriverAccounts]
 *     description: Super Admin xem toan bo tai khoan tai xe. Agency Manager chi xem tai khoan tai xe trong dai ly cua minh.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Trang hien tai
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: So ban ghi moi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tim theo email, ten tai xe hoac so dien thoai
 *       - in: query
 *         name: agency_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chi Super Admin duoc loc theo dai ly
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Loc theo trang thai kich hoat cua tai khoan
 *     responses:
 *       200:
 *         description: Lay danh sach tai khoan tai xe thanh cong
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
 *                   example: Lay danh sach tai khoan tai xe thanh cong
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DriverAccountResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', validateListDriverAccounts, listDriverAccounts);

/**
 * @swagger
 * /api/driver-accounts:
 *   post:
 *     summary: Tao tai khoan tai xe
 *     tags: [DriverAccounts]
 *     description: Super Admin co the tao tai khoan cho tai xe cua bat ky dai ly nao. Agency Manager chi duoc tao tai khoan cho tai xe trong dai ly cua minh. Hay lay driver_id tu API danh sach tai xe va dung email lam dinh danh dang nhap cua tai xe. Mat khau se duoc he thong tu tao va gui qua email cho tai xe.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DriverAccountPayload'
 *     responses:
 *       201:
 *         description: Tao tai khoan tai xe thanh cong
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
 *                   example: Tao tai khoan tai xe thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/DriverAccountResponse'
 *       404:
 *         description: Khong tim thay tai xe
 *       409:
 *         description: Tai xe da co tai khoan hoac email da ton tai
 */
router.post('/', validateCreateDriverAccount, createDriverAccount);

/**
 * @swagger
 * /api/driver-accounts/{id}:
 *   put:
 *     summary: Cap nhat tai khoan tai xe
 *     tags: [DriverAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID tai khoan tai xe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: driver.updated@smartdrive.vn
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Cap nhat tai khoan tai xe thanh cong
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
 *                   example: Cap nhat tai khoan tai xe thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/DriverAccountResponse'
 *       404:
 *         description: Khong tim thay tai khoan tai xe
 *       409:
 *         description: Email da ton tai
 */
router.put('/:id', validateDriverAccountId, validateUpdateDriverAccount, updateDriverAccount);

/**
 * @swagger
 * /api/driver-accounts/{id}/reset-password:
 *   put:
 *     summary: Reset mat khau tai khoan tai xe
 *     tags: [DriverAccounts]
 *     description: Admin/Agency Manager dat lai mat khau tai khoan tai xe. He thong tu tao mat khau moi va gui qua email cho tai xe. Tai xe se phai doi mat khau khi dang nhap lan tiep theo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID tai khoan tai xe
 *     responses:
 *       200:
 *         description: Reset mat khau tai khoan tai xe thanh cong
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
 *                   example: Reset mat khau tai khoan tai xe thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/DriverAccountResponse'
 *       404:
 *         description: Khong tim thay tai khoan tai xe
 */
router.put('/:id/reset-password', validateDriverAccountId, validateResetDriverAccountPassword, resetDriverAccountPassword);

/**
 * @swagger
 * /api/driver-accounts/{id}:
 *   delete:
 *     summary: Xoa tai khoan tai xe
 *     tags: [DriverAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID tai khoan tai xe
 *     responses:
 *       200:
 *         description: Xoa tai khoan tai xe thanh cong
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
 *                   example: Xoa tai khoan tai xe thanh cong
 *                 data:
 *                   $ref: '#/components/schemas/DriverAccountDeleteResponse'
 *       404:
 *         description: Khong tim thay tai khoan tai xe
 */
router.delete('/:id', validateDriverAccountId, deleteDriverAccount);

export default router;