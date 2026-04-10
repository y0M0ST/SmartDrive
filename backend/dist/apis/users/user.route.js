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
const userController = __importStar(require("./user.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const user_dto_1 = require("./user.dto");
const router = (0, express_1.Router)();
// Áp dụng middleware kiểm tra đăng nhập và quyền quản trị
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'AGENCY_ADMIN']));
/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Quản lý tài khoản người dùng (Admin)
 */
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users with pagination and filters
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Current page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name or email
 *       - in: query
 *         name: agency_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional for super admin only
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by role id
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, BLOCKED, INACTIVE]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Success
 *
 *   post:
 *     summary: Create a new user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - phone
 *               - role_id
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Nguyen Van A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: phucnguyen2812cuwin+driver01@gmail.com
 *               phone:
 *                 type: string
 *                 example: "0988123456"
 *               role_id:
 *                 type: string
 *                 format: uuid
 *                 example: d19b49b8-3e4b-4b15-9c88-e21b0b5c1234
 *               agency_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Required for non-super-admin accounts
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation or business error
 */
router.get('/', (0, validate_middleware_1.validate)(user_dto_1.getUserQuerySchema), userController.getUsers);
router.post('/', (0, validate_middleware_1.validate)(user_dto_1.createUserSchema), userController.createUser);
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Cập nhật thông tin tài khoản
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng cần sửa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn Đã Đổi Tên"
 *               email:
 *                 type: string
 *                 example: "doiten@gmail.com"
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *               role_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *
 *   delete:
 *     summary: Xóa mềm tài khoản
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng cần xóa
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công
 *       400:
 *         description: Không thể xóa tài xế đang có chuyến (Ràng buộc logic)
 */
router.put('/:id', (0, validate_middleware_1.validate)(user_dto_1.updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);
/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Khóa hoặc mở khóa tài khoản
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BLOCKED]
 *                 example: "BLOCKED"
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 */
router.patch('/:id/status', (0, validate_middleware_1.validate)(user_dto_1.changeStatusSchema), userController.changeStatus);
exports.default = router;
//# sourceMappingURL=user.route.js.map