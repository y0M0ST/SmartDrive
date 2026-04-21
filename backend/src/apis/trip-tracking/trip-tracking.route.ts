import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAgencyTrackingAccess } from './trip-tracking.middleware';
import * as tripTrackingController from './trip-tracking.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Trip tracking
 *     description: US_09 — Bản đồ giám sát (agency scope)
 */

/**
 * @swagger
 * /api/trips/active-tracking:
 *   get:
 *     summary: Chuyến IN_PROGRESS + GPS mới nhất (AGENCY_ADMIN, DISPATCHER)
 *     tags: [Trip tracking]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/active-tracking',
    authMiddleware,
    requireAgencyTrackingAccess,
    tripTrackingController.getActiveTracking,
);

export default router;
