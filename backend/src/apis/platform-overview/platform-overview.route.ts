import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import * as platformOverviewController from './platform-overview.controller';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN']));

/**
 * Super Admin — dashboard tổng quan nền tảng (DB + Node.js + Socket.io).
 */
router.get('/overview', platformOverviewController.getOverview);

export default router;
