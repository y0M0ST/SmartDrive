import { Router } from 'express';
import { deviceAuthMiddleware } from '../../middleware/device-auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { postGpsSchema } from './gps.dto';
import * as gpsController from './gps.controller';

const router = Router();

/**
 * @swagger
 * /api/device/gps:
 *   post:
 *     summary: Gửi tọa độ GPS từ thiết bị AI (PB_09)
 *     description: |
 *       **Auth:** header `x-device-api-key` = `MASTER_DEVICE_API_KEY`.
 *       Thiết bị gọi mỗi 5 giây khi chuyến IN_PROGRESS. Server lưu DB và emit Socket.io.
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trip_id, latitude, longitude, speed]
 *             properties:
 *               trip_id:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               speed:
 *                 type: number
 *                 description: km/h
 *               heading:
 *                 type: number
 *                 description: 0–360 độ (hướng đầu xe)
 *               recorded_at:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601, nếu bỏ trống server dùng thời điểm nhận
 *     responses:
 *       200:
 *         description: ACK — đã lưu tọa độ
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc trip không IN_PROGRESS
 *       401:
 *         description: Sai API key
 *       404:
 *         description: Trip không tồn tại
 */
router.post('/gps', deviceAuthMiddleware, validate(postGpsSchema), gpsController.postGps);

export default router;
