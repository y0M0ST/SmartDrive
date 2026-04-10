import { z } from 'zod';
import { RouteStatus } from '../../common/constants/enums';
import {
    isVietnamProvinceCode,
    normalizeVietnamProvinceCode,
} from '../provinces/province.constant';

const routeStatusOptions = [RouteStatus.ACTIVE, RouteStatus.SUSPENDED] as const;

const vietnamProvinceCodeField = z
    .string()
    .min(1, 'Mã tỉnh/thành không được để trống')
    .transform(normalizeVietnamProvinceCode)
    .refine(isVietnamProvinceCode, {
        message: 'Mã tỉnh/thành không hợp lệ. Chọn mã trong danh mục (GET /api/provinces).',
    });
const uuidParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('ID tuyến đường không hợp lệ'),
    }),
});

export const createRouteSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Tên tuyến đường không được để trống'),
        start_point: vietnamProvinceCodeField,
        end_point: vietnamProvinceCodeField,
        distance_km: z.number().positive('Cự ly phải lớn hơn 0'),
        estimated_hours: z.number().positive('Thời gian dự kiến phải lớn hơn 0'),
    }).refine((data) => data.start_point !== data.end_point, {
        message: 'Điểm xuất phát và Điểm đến không được trùng nhau!',
        path: ['end_point'], // Chỉ định lỗi này thuộc về ô end_point trên UI
    })
});

export const updateRouteSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        start_point: vietnamProvinceCodeField.optional(),
        end_point: vietnamProvinceCodeField.optional(),
        distance_km: z.number().positive().optional(),
        estimated_hours: z.number().positive().optional(),
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

export const changeRouteStatusSchema = z.object({
    body: z.object({
        status: z.enum(routeStatusOptions, { message: 'Trạng thái không hợp lệ' }),
    })
});

export const getRouteQuerySchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
        search: z.string().optional(),
        status: z.enum(routeStatusOptions).optional(),
    })
});

export const routeIdParamSchema = uuidParamSchema;

export type CreateRouteInput = z.infer<typeof createRouteSchema>['body'];
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>['body'];
export type GetRouteQuery = z.infer<typeof getRouteQuerySchema>['query'];