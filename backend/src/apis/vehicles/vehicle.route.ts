import { Router } from 'express';
import * as vehicleController from './vehicle.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    changeVehicleStatusSchema,
    createVehicleSchema,
    getVehicleQuerySchema,
    updateVehicleSchema,
    vehicleIdParamSchema,
} from './vehicle.dto';

const router = Router();

router.use(authMiddleware, requireRole(['SUPER_ADMIN', 'AGENCY_ADMIN', 'COORDINATOR']));

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
router.get('/', validate(getVehicleQuerySchema), vehicleController.getVehicles);
router.post('/', validate(createVehicleSchema), vehicleController.createVehicle);

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
router.put('/:id', validate(vehicleIdParamSchema.merge(updateVehicleSchema)), vehicleController.updateVehicle);
router.delete('/:id', validate(vehicleIdParamSchema), vehicleController.deleteVehicle);

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
router.patch('/:id/status', validate(vehicleIdParamSchema.merge(changeVehicleStatusSchema)), vehicleController.changeStatus);

export default router;