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
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const agencyController = __importStar(require("./agency.controller"));
const agency_dto_1 = require("./agency.dto");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'AGENCY_ADMIN']));
/**
 * @swagger
 * tags:
 *   - name: Agencies
 *     description: Quản lý thông tin Nhà xe (Agency)
 */
/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Lấy danh sách nhà xe
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', (0, validate_middleware_1.validate)(agency_dto_1.getAgencyQuerySchema), agencyController.getAgencies);
/**
 * @swagger
 * /api/agencies:
 *   post:
 *     summary: Tạo nhà xe mới (Chỉ dành cho SUPER_ADMIN)
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name]
 *             properties:
 *               code:
 *                 type: string
 *                 example: AGENCY_11
 *               name:
 *                 type: string
 *                 example: Nhà xe Phương Trang
 *               address:
 *                 type: string
 *                 example: 123 Lê Duẩn, Đà Nẵng
 *               phone:
 *                 type: string
 *                 example: "0900000111"
 *     responses:
 *       201:
 *         description: Tạo nhà xe thành công
 */
router.post('/', (0, validate_middleware_1.validate)(agency_dto_1.createAgencySchema), agencyController.createAgency);
/**
 * @swagger
 * /api/agencies/{id}:
 *   put:
 *     summary: Cập nhật thông tin nhà xe
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nhà xe Phương Trang (Update)
 *               address:
 *                 type: string
 *                 example: 456 Hoàng Diệu, Đà Nẵng
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin thành công
 */
router.put('/:id', (0, validate_middleware_1.validate)(agency_dto_1.updateAgencySchema), agencyController.updateAgency);
/**
 * @swagger
 * /api/agencies/{id}/status:
 *   patch:
 *     summary: Thay đổi trạng thái nhà xe (Khóa/Mở khóa)
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: "INACTIVE"
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 */
router.patch('/:id/status', (0, validate_middleware_1.validate)(agency_dto_1.changeAgencyStatusSchema), agencyController.changeAgencyStatus);
exports.default = router;
//# sourceMappingURL=agency.route.js.map