import { Router } from 'express';
import { deviceAuthMiddleware } from '../../middleware/device-auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as deviceGpsController from './device-gps.controller';
import { deviceGpsIngestSchema } from './device-gps.dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Device AI
 *     description: Ingest từ thiết bị / Python (US_09 GPS)
 */

/**
 * @swagger
 * /api/device/gps:
 *   post:
 *     summary: Ghi nhận điểm GPS cho chuyến IN_PROGRESS
 *     tags: [Device AI]
 *     security:
 *       - deviceApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trip_id, latitude, longitude, speed]
 *             properties:
 *               trip_id: { type: string, format: uuid }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               speed: { type: number }
 *               heading: { type: number, nullable: true }
 */
router.post('/gps', deviceAuthMiddleware, validate(deviceGpsIngestSchema), deviceGpsController.postDeviceGps);

export default router;
