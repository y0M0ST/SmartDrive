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
 *     summary: Ghi nhận một điểm GPS cho chuyến đang chạy (US_09)
 *     description: |
 *       **Auth:** `deviceApiKey` — header `x-device-api-key` = `MASTER_DEVICE_API_KEY`.
 *       Chuyến phải ở trạng thái **IN_PROGRESS** (theo logic service hiện tại).
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
 *               trip_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID chuyến
 *               latitude:
 *                 type: number
 *                 description: Vĩ độ WGS84
 *               longitude:
 *                 type: number
 *                 description: Kinh độ WGS84
 *               speed:
 *                 type: number
 *                 description: km/h (hoặc đơn vị thống nhất với thiết bị)
 *               heading:
 *                 type: number
 *                 nullable: true
 *                 description: Góc hướng (độ), tùy chọn
 *     responses:
 *       200:
 *         description: Đã lưu điểm GPS
 *       400:
 *         description: JSON không hợp lệ hoặc chuyến không IN_PROGRESS
 *       401:
 *         description: Sai hoặc thiếu API key
 *       404:
 *         description: Không tìm thấy chuyến
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/gps', deviceAuthMiddleware, validate(deviceGpsIngestSchema), deviceGpsController.postDeviceGps);

export default router;
