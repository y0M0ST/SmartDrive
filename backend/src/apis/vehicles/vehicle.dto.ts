import { z } from 'zod';
import { VehicleType, VehicleStatus } from '../../common/constants/enums';

// Biểu thức Regex bắt Biển số xe VN (VD: 51B-12345, 29A-1234)
const vnLicensePlateRegex = /^[0-9]{2}[A-Z][0-9]?-[0-9]{4,5}$/;
const vehicleCapacityOptions = [16, 29, 45] as const;
const vehicleStatusOptions = [
    VehicleStatus.AVAILABLE,
    VehicleStatus.IN_SERVICE,
    VehicleStatus.MAINTENANCE,
    VehicleStatus.INACTIVE,
] as const;
const vehicleTypeOptions = [VehicleType.SEAT, VehicleType.SLEEPER] as const;
const uuidParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('ID phương tiện không hợp lệ'),
    }),
});

export const createVehicleSchema = z.object({
    body: z.object({
        license_plate: z.string().regex(vnLicensePlateRegex, 'Biển số xe không đúng định dạng (VD: 51B-12345)'),
        type: z.enum(vehicleTypeOptions, { message: 'Loại xe không hợp lệ' }),
        capacity: z.number().int().refine((value) => vehicleCapacityOptions.includes(value as 16 | 29 | 45), {
            message: 'Số chỗ chỉ được chọn 16, 29 hoặc 45',
        }),
        ai_camera_id: z.string().optional().nullable(),
    })
});

export const updateVehicleSchema = z.object({
    body: z.object({
        license_plate: z.string().regex(vnLicensePlateRegex).optional(),
        type: z.enum(vehicleTypeOptions).optional(),
        capacity: z.number().int().refine((value) => vehicleCapacityOptions.includes(value as 16 | 29 | 45), {
            message: 'Số chỗ chỉ được chọn 16, 29 hoặc 45',
        }).optional(),
        ai_camera_id: z.string().optional().nullable(),
    })
});

export const changeVehicleStatusSchema = z.object({
    body: z.object({
        status: z.enum(vehicleStatusOptions),
    })
});

// Phân trang & Lọc cho list
export const getVehicleQuerySchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
        search: z.string().optional(), // Tìm theo biển số
        status: z.enum(vehicleStatusOptions).optional(),
        type: z.enum(vehicleTypeOptions).optional(),
    })
});

export const vehicleIdParamSchema = uuidParamSchema;

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>['body'];
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>['body'];
export type GetVehicleQuery = z.infer<typeof getVehicleQuerySchema>['query'];