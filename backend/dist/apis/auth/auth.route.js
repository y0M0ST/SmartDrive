"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_dto_1 = require("./auth.dto");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Dang nhap he thong
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email
 *                 example: superadmin.smartdrive@gmail.com
 *               password:
 *                 type: string
 *                 description: Mat khau
 *                 example: 12345678
 *     responses:
 *       200:
 *         description: Dang nhap thanh cong, tra ve token
 *       400:
 *         description: Sai thong tin dang nhap
 */
router.post('/login', (0, validate_middleware_1.validate)(auth_dto_1.loginSchema), auth_controller_1.loginController);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Dang xuat he thong
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Dang xuat thanh cong
 */
router.post('/logout', (0, validate_middleware_1.validate)(auth_dto_1.logoutSchema), auth_controller_1.logoutController);
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Doi mat khau khi dang dang nhap
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: "12345678"
 *               newPassword:
 *                 type: string
 *                 example: "SmartDrive@Moi"
 *               confirmNewPassword:
 *                 type: string
 *                 example: "SmartDrive@Moi"
 *     responses:
 *       200:
 *         description: Doi mat khau thanh cong
 *       400:
 *         description: Mat khau cu khong chinh xac hoac xac nhan khong khop
 */
router.post('/change-password', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validate)(auth_dto_1.changePasswordSchema), auth_controller_1.changePasswordController);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Gui email khoi phuc mat khau
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: driver01.smartdrive@gmail.com
 *     responses:
 *       200:
 *         description: Da gui email khoi phuc (neu email hop le)
 *       400:
 *         description: Email khong ton tai hoac sai dinh dang
 */
router.post('/forgot-password', (0, validate_middleware_1.validate)(auth_dto_1.forgotPasswordSchema), auth_controller_1.forgotPasswordController);
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Dat lai mat khau bang token (tu link email)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token lay tu URL email
 *                 example: "8f7b...token_raw_tu_email"
 *               newPassword:
 *                 type: string
 *                 example: "MatKhauMoi@123"
 *               confirmNewPassword:
 *                 type: string
 *                 example: "MatKhauMoi@123"
 *     responses:
 *       200:
 *         description: Dat lai mat khau thanh cong
 *       400:
 *         description: Token het han hoac mat khau khong khop
 */
router.post('/reset-password', (0, validate_middleware_1.validate)(auth_dto_1.resetPasswordSchema), auth_controller_1.resetPasswordController);
exports.default = router;
//# sourceMappingURL=auth.route.js.map