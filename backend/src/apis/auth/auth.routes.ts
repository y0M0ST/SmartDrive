import { Router } from 'express';
import { login, logout, changePassword } from './auth.controller';
import { validateLogin, validateChangePassword } from './auth.validator';
import { authenticate } from '../../common/middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
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
 *                 example: admin@smartdrive.vn
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login success
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled
 */
router.post('/login', validateLogin, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout success
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [old_password, new_password, confirm_password]
 *             properties:
 *               old_password:
 *                 type: string
 *                 example: Admin@123
 *               new_password:
 *                 type: string
 *                 example: Admin@456
 *               confirm_password:
 *                 type: string
 *                 example: Admin@456
 *     responses:
 *       200:
 *         description: Change password success
 *       400:
 *         description: Validation error
 *       401:
 *         description: Wrong old password
 */
router.put('/change-password', authenticate, validateChangePassword, changePassword);

export default router;