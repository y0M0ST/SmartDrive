import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { requireAgencyAdminOrDispatcher } from '../../middleware/agency-admin-dispatcher.middleware';
import * as violationsInboxController from './violations-inbox.controller';
import { violationsUnreadQuerySchema, violationAcknowledgeParamSchema } from './violations-inbox.dto';

const router = Router();

router.use(authMiddleware, requireAgencyAdminOrDispatcher);

/**
 * @swagger
 * tags:
 *   - name: Violations inbox
 *     description: US_10 — Chuông vi phạm AI (agency)
 */

router.get('/unread', validate(violationsUnreadQuerySchema), violationsInboxController.getUnreadViolations);
router.patch(
    '/:id/acknowledge',
    validate(violationAcknowledgeParamSchema),
    violationsInboxController.acknowledgeViolation,
);

export default router;
