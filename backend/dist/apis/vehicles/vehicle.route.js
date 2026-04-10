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
const vehicleController = __importStar(require("./vehicle.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const vehicle_dto_1 = require("./vehicle.dto");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.requireRole)(['SUPER_ADMIN', 'AGENCY_ADMIN', 'COORDINATOR']));
/**
 * @swagger
 * tags:
 *   - name: Vehicles
 *     description: Quản lý phương tiện xe khách
 */
/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Lấy danh sách phương tiện
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo biển số (không phân biệt hoa thường)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, IN_SERVICE, MAINTENANCE, INACTIVE]
 *         description: Lọc theo trạng thái phương tiện
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SEAT, SLEEPER]
 *         description: Lọc theo loại xe
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       400:
 *         description: Tham số query không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *   post:
 *     summary: Tạo phương tiện mới
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_plate
 *               - type
 *               - capacity
 *             properties:
 *               license_plate:
 *                 type: string
 *                 example: 51B-12345
 *               type:
 *                 type: string
 *                 enum: [SEAT, SLEEPER]
 *                 example: SEAT
 *               capacity:
 *                 type: integer
 *                 enum: [16, 29, 45]
 *                 example: 29
 *               ai_camera_id:
 *                 type: string
 *                 nullable: true
 *                 example: CAM-0009
 *     responses:
 *       201:
 *         description: Tạo phương tiện thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       409:
 *         description: Trùng biển số hoặc trùng mã camera
 */
router.get('/', (0, validate_middleware_1.validate)(vehicle_dto_1.getVehicleQuerySchema), vehicleController.getVehicles);
router.post('/', (0, validate_middleware_1.validate)(vehicle_dto_1.createVehicleSchema), vehicleController.createVehicle);
/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Cập nhật thông tin phương tiện
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID phương tiện
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               license_plate:
 *                 type: string
 *                 example: 43A-56789
 *               type:
 *                 type: string
 *                 enum: [SEAT, SLEEPER]
 *               capacity:
 *                 type: integer
 *                 enum: [16, 29, 45]
 *               ai_camera_id:
 *                 type: string
 *                 nullable: true
 *                 description: Gửi null để gỡ liên kết camera
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy phương tiện
 *       409:
 *         description: Trùng biển số hoặc mã camera
 *   delete:
 *     summary: Xóa mềm phương tiện
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID phương tiện
 *     responses:
 *       200:
 *         description: Xóa mềm thành công
 *       400:
 *         description: Không thể xóa xe đang chạy
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy phương tiện
 */
router.put('/:id', (0, validate_middleware_1.validate)(vehicle_dto_1.vehicleIdParamSchema.merge(vehicle_dto_1.updateVehicleSchema)), vehicleController.updateVehicle);
router.delete('/:id', (0, validate_middleware_1.validate)(vehicle_dto_1.vehicleIdParamSchema), vehicleController.deleteVehicle);
/**
 * @swagger
 * /api/vehicles/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái phương tiện
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID phương tiện
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
 *                 enum: [AVAILABLE, IN_SERVICE, MAINTENANCE, INACTIVE]
 *                 example: MAINTENANCE
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 *       400:
 *         description: Trạng thái không hợp lệ hoặc xe đang chạy
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy phương tiện
 */
router.patch('/:id/status', (0, validate_middleware_1.validate)(vehicle_dto_1.vehicleIdParamSchema.merge(vehicle_dto_1.changeVehicleStatusSchema)), vehicleController.changeStatus);
exports.default = router;
//# sourceMappingURL=vehicle.route.js.map