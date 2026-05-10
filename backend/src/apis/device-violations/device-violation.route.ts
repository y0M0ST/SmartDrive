import { Router } from 'express';
import { deviceAuthMiddleware } from '../../middleware/device-auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadConfig } from '../../utils/upload';
import * as deviceViolationController from './device-violation.controller';
import * as deviceViolationJsonController from './device-violation-json.controller';
import { deviceViolationJsonBodySchema } from './device-violation-json.dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Device AI
 *     description: Ingest từ thiết bị / Python (vi phạm US_10/US_20, GPS US_09)
 */

/**
 * @swagger
 * /api/device/violations:
 *   post:
 *     summary: Gửi sự kiện vi phạm AI (multipart + metadata JSON)
 *     description: |
 *       **Auth:** `deviceApiKey` — header `x-device-api-key` trùng `MASTER_DEVICE_API_KEY` trên server.
 *       **Form-data:** trường `image` (file JPEG/PNG), trường `data` (chuỗi JSON) gồm:
 *       `deviceEventId`, `tripId`, `type` (DROWSY \| DISTRACTED), `occurredAt` (ISO 8601), `latitude?`, `longitude?`.
 *       Chuyến phải **IN_PROGRESS hoặc COMPLETED** và `occurredAt` nằm trong khoảng thời gian chuyến (xem logic backend).
 *       Idempotency: cùng `deviceEventId` → ACK trùng, không tạo bản ghi mới.
 *     tags: [Device AI]
 *     security:
 *       - deviceApiKey: []
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
 *                 description: Ảnh bằng chứng
 *               data:
 *                 type: string
 *                 description: |
 *                   Chuỗi JSON một dòng, ví dụ:
 *                   `{"deviceEventId":"...","tripId":"uuid","type":"DROWSY","occurredAt":"2026-04-18T10:00:00.000Z","latitude":16.04,"longitude":108.25}`
 *     responses:
 *       200:
 *         description: Ghi nhận thành công hoặc ACK idempotent (trùng deviceEventId)
 *       400:
 *         description: Thiếu file/metadata, trip không hợp lệ, `occurred_at` ngoài khoảng chuyến, v.v.
 *       401:
 *         description: Sai hoặc thiếu API key thiết bị
 *       404:
 *         description: Không tìm thấy chuyến
 *       500:
 *         description: Lỗi máy chủ (upload ảnh, DB, v.v.)
 */
router.post(
    '/violations',
    deviceAuthMiddleware,
    uploadConfig.single('image'),
    deviceViolationController.postDeviceViolation,
);

/**
 * @swagger
 * /api/device/violation:
 *   post:
 *     summary: Ghi nhận vi phạm AI (JSON — US_10, Edge/Python)
 *     description: |
 *       **Auth:** `deviceApiKey` — header `x-device-api-key`.
 *       **Body JSON:** khớp Zod `deviceViolationJsonBodySchema`: `device_event_id`, `trip_id`, `violation_type`,
 *       đúng một trong `image_base64` **hoặc** `image_url`, tùy chọn `latitude`, `longitude`, `occurred_at`.
 *       Nếu không gửi `occurred_at`, server dùng thời điểm nhận request. Điều kiện chuyến giống ingest multipart.
 *     tags: [Device AI]
 *     security:
 *       - deviceApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_event_id
 *               - trip_id
 *               - violation_type
 *             properties:
 *               device_event_id:
 *                 type: string
 *                 maxLength: 255
 *                 description: Idempotency key (unique)
 *               trip_id:
 *                 type: string
 *                 format: uuid
 *               violation_type:
 *                 type: string
 *                 enum: [DROWSY, DISTRACTED]
 *               image_base64:
 *                 type: string
 *                 minLength: 8
 *                 description: Raw base64 hoặc data URL ảnh (chỉ dùng nếu không có image_url)
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL ảnh có sẵn (chỉ dùng nếu không có image_base64)
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *               occurred_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời điểm vi phạm (nên gửi khi đồng bộ trễ)
 *     responses:
 *       200:
 *         description: Đã ghi nhận hoặc ACK idempotent
 *       400:
 *         description: Dữ liệu không hợp lệ (thiếu ảnh, cả hai URL+base64, ngoài khoảng chuyến, v.v.)
 *       401:
 *         description: Sai hoặc thiếu API key
 *       404:
 *         description: Không tìm thấy chuyến
 *       500:
 *         description: Lỗi máy chủ
 */
router.post(
    '/violation',
    deviceAuthMiddleware,
    validate(deviceViolationJsonBodySchema),
    deviceViolationJsonController.postDeviceViolationJson,
);

export default router;
