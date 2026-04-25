import { Router } from 'express';
import { deviceAuthMiddleware } from '../../middleware/device-auth.middleware';
import { uploadConfig } from '../../utils/upload';
import * as deviceViolationController from './device-violation.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Device AI
 *     description: Ingest vi phạm từ thiết bị / Python (US_20)
 */

/**
 * @swagger
 * /api/device/violations:
 *   post:
 *     summary: Gửi sự kiện vi phạm AI (multipart)
 *     description: |
 *       **Auth:** header `x-device-api-key` = `MASTER_DEVICE_API_KEY`.
 *       **Form:** `image` (file), `data` (JSON string: deviceEventId, tripId, type, occurredAt, latitude?, longitude?).
 *     tags: [Device AI]
 *     parameters:
 *       - in: header
 *         name: x-device-api-key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image, data]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               data:
 *                 type: string
 *                 description: JSON string metadata
 *     responses:
 *       200:
 *         description: ACK (ghi mới hoặc idempotent trùng deviceEventId)
 *       400:
 *         description: Thiếu file / metadata / trip không IN_PROGRESS
 *       401:
 *         description: Sai hoặc thiếu API key
 *       404:
 *         description: Không có trip
 */
router.post(
    '/violations',
    deviceAuthMiddleware,
    uploadConfig.single('image'),
    deviceViolationController.postDeviceViolation,
);

export default router;
