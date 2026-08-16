import { Router } from 'express';
import {
    loginController,
    logoutController,
    changePasswordController,
    forgotPasswordController,
    resetPasswordController,
    getMeController,
    patchMeProfileController,
    requestContactChangeController,
    verifyContactChangeController,
} from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import {
    loginSchema,
    logoutSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    patchMeProfileSchema,
    contactChangeRequestSchema,
    contactChangeVerifySchema,
} from './auth.dto';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Đăng nhập, phiên, mật khẩu, hồ sơ tài khoản (JWT Bearer)
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Thông tin user đang đăng nhập (kèm role, agency)
 *     description: Trả về dữ liệu từ DB theo `req.user.id` trong JWT (phiên phải còn hiệu lực).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Thiếu token, token hết hạn hoặc phiên đã bị thu hồi
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/me', authMiddleware, getMeController);

/**
 * @swagger
 * /api/auth/me/profile:
 *   patch:
 *     summary: Cập nhật họ tên hiển thị (không qua OTP)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name]
 *             properties:
 *               full_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Nguyễn Văn A"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ (Zod)
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi máy chủ
 */
router.patch(
    '/me/profile',
    authMiddleware,
    validate(patchMeProfileSchema),
    patchMeProfileController,
);
/**
 * @swagger
 * /api/auth/me/contact-change/request:
 *   post:
 *     summary: Bước 1 — Yêu cầu đổi email hoặc SĐT (gửi OTP)
 *     description: |
 *       Discriminated union theo `kind`:
 *       - `EMAIL`: body gồm `newEmail` (OTP gửi tới email mới).
 *       - `PHONE`: body gồm `newPhone` (OTP gửi tới email hiện tại của user).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [kind, newEmail]
 *                 properties:
 *                   kind:
 *                     type: string
 *                     enum: [EMAIL]
 *                   newEmail:
 *                     type: string
 *                     format: email
 *               - type: object
 *                 required: [kind, newPhone]
 *                 properties:
 *                   kind:
 *                     type: string
 *                     enum: [PHONE]
 *                   newPhone:
 *                     type: string
 *                     minLength: 10
 *                     maxLength: 20
 *     responses:
 *       200:
 *         description: Đã tạo yêu cầu / gửi OTP (chi tiết trong message)
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc vi phạm nghiệp vụ (email/SĐT trùng, v.v.)
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy người dùng
 *       429:
 *         description: Gửi OTP quá nhanh (chờ cooldown theo message)
 *       500:
 *         description: Lỗi máy chủ hoặc lỗi gửi email (SMTP)
 */
router.post(
    '/me/contact-change/request',
    authMiddleware,
    validate(contactChangeRequestSchema),
    requestContactChangeController,
);

/**
 * @swagger
 * /api/auth/me/contact-change/verify:
 *   post:
 *     summary: Bước 2 — Xác nhận OTP để hoàn tất đổi email/SĐT
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kind, otp]
 *             properties:
 *               kind:
 *                 type: string
 *                 enum: [EMAIL, PHONE]
 *               otp:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Cập nhật liên hệ thành công
 *       400:
 *         description: OTP sai / hết hạn hoặc không có yêu cầu đổi trước đó
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi máy chủ
 */
router.post(
    '/me/contact-change/verify',
    authMiddleware,
    validate(contactChangeVerifySchema),
    verifyContactChangeController,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập — lấy access token & refresh token
 *     description: |
 *       Public API (không Bearer). Body gồm `email`, `password`. Trả về JWT và payload user tùy service.
 *     tags: [Auth]
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
 *                 format: email
 *                 example: superadmin.smartdrive@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "12345678"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công — trả token (chi tiết trong `data`)
 *       400:
 *         description: Email/sai định dạng hoặc thiếu mật khẩu
 *       401:
 *         description: Sai mật khẩu hoặc tài khoản không hợp lệ (tùy implementation)
 *       403:
 *         description: Tài khoản bị khóa (nếu có)
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/login', validate(loginSchema), loginController);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất — thu hồi refresh token / phiên
 *     description: Public — body chứa `refreshToken` để vô hiệu hóa phiên tương ứng.
 *     tags: [Auth]
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
 *         description: Đăng xuất thành công
 *       400:
 *         description: Thiếu refresh token hoặc không hợp lệ
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/logout', validate(logoutSchema), logoutController);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu khi đã đăng nhập
 *     description: |
 *       Mật khẩu mới tối thiểu 6 ký tự; `newPassword` phải khớp `confirmNewPassword` và khác `oldPassword` (Zod).
 *     tags: [Auth]
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
 *                 minLength: 6
 *                 example: "SmartDrive@Moi"
 *               confirmNewPassword:
 *                 type: string
 *                 example: "SmartDrive@Moi"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ sai, xác nhận không khớp, hoặc mật khẩu mới trùng mật cũ
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi máy chủ
 */
router.post(
    '/change-password',
    authMiddleware,
    validate(changePasswordSchema),
    changePasswordController
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Quên mật khẩu — gửi email chứa link/token đặt lại
 *     description: Public. Thường luôn trả 200 để không lộ email tồn tại hay không (tùy policy backend).
 *     tags: [Auth]
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
 *                 format: email
 *                 example: driver01.smartdrive@gmail.com
 *     responses:
 *       200:
 *         description: Đã xử lý yêu cầu (xem message trong body)
 *       400:
 *         description: Email không đúng định dạng
 *       500:
 *         description: Lỗi máy chủ / gửi mail
 */
router.post(
    '/forgot-password',
    validate(forgotPasswordSchema),
    forgotPasswordController
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu bằng token từ email
 *     description: Public. `newPassword` tối thiểu 6 ký tự và phải khớp `confirmNewPassword`.
 *     tags: [Auth]
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
 *                 description: Token thô lấy từ URL trong email
 *                 example: "8f7b...token_raw_tu_email"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "MatKhauMoi@123"
 *               confirmNewPassword:
 *                 type: string
 *                 example: "MatKhauMoi@123"
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Token hết hạn/không hợp lệ, mật khẩu không khớp, hoặc không đủ độ dài
 *       500:
 *         description: Lỗi máy chủ
 */
router.post(
    '/reset-password',
    validate(resetPasswordSchema),
    resetPasswordController
);

export default router;