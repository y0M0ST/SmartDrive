"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeIdParamSchema = exports.getRouteQuerySchema = exports.changeRouteStatusSchema = exports.updateRouteSchema = exports.createRouteSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../common/constants/enums");
const routeStatusOptions = [enums_1.RouteStatus.ACTIVE, enums_1.RouteStatus.SUSPENDED];
const uuidParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID tuyến đường không hợp lệ'),
    }),
});
exports.createRouteSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Tên tuyến đường không được để trống'),
        start_point: zod_1.z.string().min(1, 'Điểm xuất phát không được để trống'),
        end_point: zod_1.z.string().min(1, 'Điểm đến không được để trống'),
        distance_km: zod_1.z.number().positive('Cự ly phải lớn hơn 0'),
        estimated_hours: zod_1.z.number().positive('Thời gian dự kiến phải lớn hơn 0'),
    }).refine((data) => data.start_point !== data.end_point, {
        message: 'Điểm xuất phát và Điểm đến không được trùng nhau!',
        path: ['end_point'], // Chỉ định lỗi này thuộc về ô end_point trên UI
    })
});
exports.updateRouteSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        start_point: zod_1.z.string().min(1).optional(),
        end_point: zod_1.z.string().min(1).optional(),
        distance_km: zod_1.z.number().positive().optional(),
        estimated_hours: zod_1.z.number().positive().optional(),
    }).refine((data) => {
        // Nếu có gửi lên cả 2 điểm thì mới check trùng
        if (data.start_point && data.end_point) {
            return data.start_point !== data.end_point;
        }
        return true;
    }, {
        message: 'Điểm xuất phát và Điểm đến không được trùng nhau!',
        path: ['end_point'],
    })
});
exports.changeRouteStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(routeStatusOptions, { message: 'Trạng thái không hợp lệ' }),
    })
});
exports.getRouteQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('10'),
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(routeStatusOptions).optional(),
    })
});
exports.routeIdParamSchema = uuidParamSchema;
//# sourceMappingURL=route.dto.js.map