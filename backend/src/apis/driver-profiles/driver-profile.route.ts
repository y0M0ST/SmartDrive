import { Router } from 'express';
import * as profileController from './driver-profile.controller';
import { uploadConfig } from '../../utils/upload';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    createProfileSchema,
    getProfileParamSchema,
    updateProfileSchema,
} from './driver-profile.dto';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN', 'DISPATCHER']));

/**
 * @swagger
 * tags:
 *   - name: Driver Profiles
 *     description: Hồ sơ tài xế (GPLX, CCCD, ảnh) — quản trị / điều hành
 */

/**
 * @swagger
 * /api/users/driver-profile:
 *   post:
 *     summary: Tạo hồ sơ tài xế (multipart + metadata)
 *     description: |
 *       Phần text khớp `createProfileSchema`: `user_id` (UUID), `id_card` (9–12 chữ số), `license_class` (B|C|D|E|F),
 *       `license_expires_at` (ngày hết hạn phải **sau** hôm nay). File ảnh gửi qua field `images` (tối đa 3 file).
 *     tags: [Driver Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - id_card
 *               - license_class
 *               - license_expires_at
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: User ID tài khoản tài xế
 *               id_card:
 *                 type: string
 *                 pattern: '^\\d{9,12}$'
 *                 example: "079123456789"
 *               license_class:
 *                 type: string
 *                 enum: [B, C, D, E, F]
 *                 example: "D"
 *               license_expires_at:
 *                 type: string
 *                 format: date
 *                 description: Ngày hết hạn GPLX (không được trong quá khứ)
 *               images:
 *                 type: array
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Ảnh minh chứng (tùy nghiệp vụ)
 *     responses:
 *       201:
 *         description: Tạo hồ sơ thành công
 *       400:
 *         description: Dữ liệu form không hợp lệ hoặc thiếu ảnh (theo service)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền (role)
 *       404:
 *         description: Không tìm thấy user tài xế (nếu có)
 *       409:
 *         description: Đã tồn tại hồ sơ cho user (nếu có)
 *       500:
 *         description: Lỗi máy chủ
 */
router.post(
    '/driver-profile',
    uploadConfig.array('images', 3),
    validate(createProfileSchema),
    profileController.createProfile,
);

/**
 * @swagger
 * /api/users/{userId}/driver-profile:
 *   put:
 *     summary: Cập nhật hồ sơ tài xế
 *     description: |
 *       Path `userId` = UUID tài khoản tài xế. Body khớp `updateProfileSchema` (bắt buộc đủ `id_card`, `license_class`, `license_expires_at` trong form).
 *       Ảnh tùy chọn qua `images` (tối đa 3).
 *     tags: [Driver Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID user tài xế
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - id_card
 *               - license_class
 *               - license_expires_at
 *             properties:
 *               id_card:
 *                 type: string
 *                 pattern: '^\\d{9,12}$'
 *               license_class:
 *                 type: string
 *                 enum: [B, C, D, E, F]
 *               license_expires_at:
 *                 type: string
 *                 format: date
 *               images:
 *                 type: array
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền
 *       404:
 *         description: Không tìm thấy hồ sơ / user
 *       500:
 *         description: Lỗi máy chủ
 */
router.put(
    '/:userId/driver-profile',
    uploadConfig.array('images', 3),
    validate(updateProfileSchema),
    profileController.updateProfile,
);

/**
 * @swagger
 * /api/users/{userId}/driver-profile:
 *   get:
 *     summary: Lấy hồ sơ tài xế theo userId
 *     description: Path khớp `getProfileParamSchema` (`userId` UUID).
 *     tags: [Driver Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID user tài xế
 *     responses:
 *       200:
 *         description: Thành công — chi tiết hồ sơ + ảnh
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền xem hồ sơ này
 *       404:
 *         description: Không có hồ sơ
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/:userId/driver-profile', validate(getProfileParamSchema), profileController.getProfile);

export default router;