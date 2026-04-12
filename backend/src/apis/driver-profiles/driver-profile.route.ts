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
 * /api/users/driver-profile:
 *   post:
 *     summary: Tao ho so tai xe
 *     tags: [Driver Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               id_card:
 *                 type: string
 *               license_class:
 *                 type: string
 *               license_expires_at:
 *                 type: string
 *                 format: date
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tao profile thanh cong
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
 *     summary: Cap nhat ho so tai xe
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
 *         description: User ID cua tai xe (immutable)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id_card:
 *                 type: string
 *               license_class:
 *                 type: string
 *               license_expires_at:
 *                 type: string
 *                 format: date
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cap nhat profile thanh cong
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
 *     summary: Lay ho so tai xe theo user id
 *     tags: [Driver Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:userId/driver-profile', validate(getProfileParamSchema), profileController.getProfile);

export default router;