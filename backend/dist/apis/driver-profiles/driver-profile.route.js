"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController = __importStar(require("./driver-profile.controller"));
const upload_1 = require("../../utils/upload");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const driver_profile_dto_1 = require("./driver-profile.dto");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'AGENCY_ADMIN', 'DISPATCHER']));
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
router.post('/driver-profile', upload_1.uploadConfig.array('images', 3), (0, validate_middleware_1.validate)(driver_profile_dto_1.createProfileSchema), profileController.createProfile);
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
router.put('/:userId/driver-profile', upload_1.uploadConfig.array('images', 3), (0, validate_middleware_1.validate)(driver_profile_dto_1.updateProfileSchema), profileController.updateProfile);
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
router.get('/:userId/driver-profile', (0, validate_middleware_1.validate)(driver_profile_dto_1.getProfileParamSchema), profileController.getProfile);
exports.default = router;
//# sourceMappingURL=driver-profile.route.js.map