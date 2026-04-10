"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleIdParamSchema = exports.getVehicleQuerySchema = exports.changeVehicleStatusSchema = exports.updateVehicleSchema = exports.createVehicleSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../common/constants/enums");
// Biểu thức Regex bắt Biển số xe VN (VD: 51B-12345, 29A-1234)
const vnLicensePlateRegex = /^[0-9]{2}[A-Z][0-9]?-[0-9]{4,5}$/;
const vehicleCapacityOptions = [16, 29, 45];
const vehicleStatusOptions = [
    enums_1.VehicleStatus.AVAILABLE,
    enums_1.VehicleStatus.IN_SERVICE,
    enums_1.VehicleStatus.MAINTENANCE,
    enums_1.VehicleStatus.INACTIVE,
];
const vehicleTypeOptions = [enums_1.VehicleType.SEAT, enums_1.VehicleType.SLEEPER];
const uuidParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID phương tiện không hợp lệ'),
    }),
});
exports.createVehicleSchema = zod_1.z.object({
    body: zod_1.z.object({
        license_plate: zod_1.z.string().regex(vnLicensePlateRegex, 'Biển số xe không đúng định dạng (VD: 51B-12345)'),
        type: zod_1.z.enum(vehicleTypeOptions, { message: 'Loại xe không hợp lệ' }),
        capacity: zod_1.z.number().int().refine((value) => vehicleCapacityOptions.includes(value), {
            message: 'Số chỗ chỉ được chọn 16, 29 hoặc 45',
        }),
        ai_camera_id: zod_1.z.string().optional().nullable(),
    })
});
exports.updateVehicleSchema = zod_1.z.object({
    body: zod_1.z.object({
        license_plate: zod_1.z.string().regex(vnLicensePlateRegex).optional(),
        type: zod_1.z.enum(vehicleTypeOptions).optional(),
        capacity: zod_1.z.number().int().refine((value) => vehicleCapacityOptions.includes(value), {
            message: 'Số chỗ chỉ được chọn 16, 29 hoặc 45',
        }).optional(),
        ai_camera_id: zod_1.z.string().optional().nullable(),
    })
});
exports.changeVehicleStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(vehicleStatusOptions),
    })
});
// Phân trang & Lọc cho list
exports.getVehicleQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('10'),
        search: zod_1.z.string().optional(), // Tìm theo biển số
        status: zod_1.z.enum(vehicleStatusOptions).optional(),
        type: zod_1.z.enum(vehicleTypeOptions).optional(),
    })
});
exports.vehicleIdParamSchema = uuidParamSchema;
//# sourceMappingURL=vehicle.dto.js.map