import { Router } from 'express';
import { driverLogin, login, logout, changePassword, forgotPassword, resetPassword } from './auth.controller';
import { validateLogin, validateDriverLogin, validateChangePassword, validateForgotPassword, validateResetPassword } from './auth.validator';
import { authenticate } from '../../common/middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     x-displayName: Login
 *     description: ""
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
 * /api/auth/driver-login:
 *   post:
 *     summary: Driver login
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
 *                 example: driver.nguyenvanan@smartdrive.vn
 *               password:
 *                 type: string
 *                 example: Driver@123
 *     responses:
 *       200:
 *         description: Driver login success
 */
router.post('/driver-login', validateDriverLogin, driverLogin);

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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Forgot password - Send OTP to email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@smartdrive.vn
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: Email not found
 */
router.post('/forgot-password', validateForgotPassword, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, new_password, confirm_password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@smartdrive.vn
 *               otp:
 *                 type: string
 *                 example: "662788"
 *               new_password:
 *                 type: string
 *                 example: Admin@789
 *               confirm_password:
 *                 type: string
 *                 example: Admin@789
 *     responses:
 *       200:
 *         description: Reset password success
 *       400:
 *         description: Invalid OTP or expired
 *       404:
 *         description: Email not found
 */
router.post('/reset-password', validateResetPassword, resetPassword);

export default router;