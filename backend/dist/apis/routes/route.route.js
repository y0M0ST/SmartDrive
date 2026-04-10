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
const routeController = __importStar(require("./route.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const route_dto_1 = require("./route.dto");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'AGENCY_ADMIN', 'COORDINATOR']));
/**
 * @swagger
 * tags:
 *   - name: Routes
 *     description: Quan ly danh muc tuyen duong
 */
/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Lay danh sach tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hien tai
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: So luong ban ghi moi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tim kiem theo ten tuyen
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED]
 *         description: Loc theo trang thai tuyen
 *     responses:
 *       200:
 *         description: Lay danh sach thanh cong
 *       400:
 *         description: Query khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *   post:
 *     summary: Tao tuyen duong moi
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - start_point
 *               - end_point
 *               - distance_km
 *               - estimated_hours
 *             properties:
 *               name:
 *                 type: string
 *                 example: Da Nang - Hue
 *               start_point:
 *                 type: string
 *                 example: Da Nang
 *               end_point:
 *                 type: string
 *                 example: Hue
 *               distance_km:
 *                 type: number
 *                 example: 102.5
 *               estimated_hours:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       201:
 *         description: Tao tuyen thanh cong
 *       400:
 *         description: Du lieu dau vao khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 */
router.get('/', (0, validate_middleware_1.validate)(route_dto_1.getRouteQuerySchema), routeController.getRoutes);
router.post('/', (0, validate_middleware_1.validate)(route_dto_1.createRouteSchema), routeController.createRoute);
/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Cap nhat thong tin tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID cua tuyen duong
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Da Nang - Hue (cao toc)
 *               start_point:
 *                 type: string
 *                 example: Da Nang
 *               end_point:
 *                 type: string
 *                 example: Hue
 *               distance_km:
 *                 type: number
 *                 example: 98.2
 *               estimated_hours:
 *                 type: number
 *                 example: 2.3
 *     responses:
 *       200:
 *         description: Cap nhat thanh cong
 *       400:
 *         description: Du lieu khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *       404:
 *         description: Khong tim thay tuyen duong
 *   delete:
 *     summary: Xoa mem tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID cua tuyen duong
 *     responses:
 *       200:
 *         description: Xoa mem thanh cong
 *       400:
 *         description: Khong the xoa vi dang co chuyen di chua chay hoac dang chay
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *       404:
 *         description: Khong tim thay tuyen duong
 */
router.put('/:id', (0, validate_middleware_1.validate)(route_dto_1.routeIdParamSchema.merge(route_dto_1.updateRouteSchema)), routeController.updateRoute);
router.delete('/:id', (0, validate_middleware_1.validate)(route_dto_1.routeIdParamSchema), routeController.deleteRoute);
/**
 * @swagger
 * /api/routes/{id}/status:
 *   patch:
 *     summary: Cap nhat trang thai tuyen duong
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID cua tuyen duong
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
 *                 enum: [ACTIVE, SUSPENDED]
 *                 example: SUSPENDED
 *     responses:
 *       200:
 *         description: Doi trang thai thanh cong
 *       400:
 *         description: Trang thai khong hop le
 *       401:
 *         description: Chua dang nhap hoac token khong hop le
 *       403:
 *         description: Khong co quyen truy cap
 *       404:
 *         description: Khong tim thay tuyen duong
 */
router.patch('/:id/status', (0, validate_middleware_1.validate)(route_dto_1.routeIdParamSchema.merge(route_dto_1.changeRouteStatusSchema)), routeController.changeStatus);
exports.default = router;
//# sourceMappingURL=route.route.js.map