import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import * as roleController from './role.controller';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN']));

/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Danh sach vai tro he thong
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Lay danh sach role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lay danh sach role thanh cong
 */
router.get('/', roleController.getRoles);

export default router;

