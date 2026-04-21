import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { requireAgencyAdminOrDispatcher } from '../../middleware/agency-admin-dispatcher.middleware';
import * as driverScoreController from './driver-score.controller';
import { leaderboardQuerySchema, driverHistoryParamSchema } from './driver-score.dto';

const router = Router();

router.use(authMiddleware, requireAgencyAdminOrDispatcher);

/**
 * @swagger
 * tags:
 *   - name: Driver scores
 *     description: US_13 — Điểm an toàn & BXH (agency)
 */

router.get('/leaderboard', validate(leaderboardQuerySchema), driverScoreController.getLeaderboard);
router.get(
    '/driver/:driverId/history',
    validate(driverHistoryParamSchema),
    driverScoreController.getDriverHistory,
);

export default router;
