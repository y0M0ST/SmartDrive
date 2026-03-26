import { Router } from 'express';
import { login } from './auth.controller';
import { validateLogin } from './auth.validator';

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

export default router;