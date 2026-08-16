import { z } from 'zod';
import { TripStatus } from '../../common/constants/enums';

const uuidParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('ID chuyến đi không hợp lệ'),
    }),
});

/**
 * Tính `planned_end_time` theo nghiệp vụ US_08.
 * Entity `Route` lưu thời lượng dự kiến ở cột `estimated_hours` (giờ, kiểu float).
 */
export function computePlannedEndTime(departureTime: Date | string, routeEstimatedHours: number): Date {
    const d = departureTime instanceof Date ? departureTime : new Date(departureTime);
    const ms = routeEstimatedHours * 60 * 60 * 1000;
    return new Date(d.getTime() + ms);
}

const departureNotInPastRefine = (departure: Date, ctx: z.RefinementCtx) => {
    const now = Date.now();
    if (departure.getTime() < now) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Giờ xuất bến không được nằm trong quá khứ',
            path: ['departure_time'],
        });
    }
};

export const createTripSchema = z.object({
    body: z
        .object({
            route_id: z.string().uuid('ID tuyến đường không hợp lệ'),
            vehicle_id: z.string().uuid('ID phương tiện không hợp lệ'),
            driver_id: z.string().uuid('ID tài xế không hợp lệ'),
            /** ISO 8601 / chuỗi số parse được qua `Date` (Zod 4: dùng preprocess thay cho coerce.date + errorMap). */
            departure_time: z.preprocess((val) => {
                if (val instanceof Date) return val;
                if (typeof val === 'string' || typeof val === 'number') return new Date(val);
                return val;
            }, z.date({ message: 'Thời gian xuất bến không hợp lệ' })),
        })
        .superRefine((data, ctx) => {
            departureNotInPastRefine(data.departure_time, ctx);
        }),
});

export const tripIdParamSchema = uuidParamSchema;

const tripStatusFilterOptions = [
    TripStatus.SCHEDULED,
    TripStatus.IN_PROGRESS,
    TripStatus.COMPLETED,
    TripStatus.CANCELLED,
] as const;

export const getTripQuerySchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
        status: z.enum(tripStatusFilterOptions).optional(),
    }),
});

const parseQueryDate = (val: unknown) => {
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return val;
};

export const availableSlotQuerySchema = z.object({
    query: z
        .object({
            departure_time: z.preprocess(parseQueryDate, z.date({ message: 'departure_time không hợp lệ' })),
            planned_end_time: z.preprocess(parseQueryDate, z.date({ message: 'planned_end_time không hợp lệ' })),
        })
        .superRefine((q, ctx) => {
            if (q.planned_end_time.getTime() <= q.departure_time.getTime()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'planned_end_time phải sau departure_time',
                    path: ['planned_end_time'],
                });
            }
        }),
});

export type CreateTripInput = z.infer<typeof createTripSchema>['body'];
export type GetTripQuery = z.infer<typeof getTripQuerySchema>['query'];
export type AvailableSlotQuery = z.infer<typeof availableSlotQuerySchema>['query'];
