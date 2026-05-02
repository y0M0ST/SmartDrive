import { z } from 'zod';

const FACE_ENCODING_DIM = 128;

const defaultPage = (v: unknown) => (v === undefined || v === null || v === '' ? 1 : v);
const defaultLimit = (v: unknown) => (v === undefined || v === null || v === '' ? 20 : v);

/**
 * Query phân trang — tuyệt đối không có `driverId` (lấy từ JWT).
 */
export const getMyTripsQuerySchema = z.object({
    query: z.object({
        page: z.preprocess(defaultPage, z.coerce.number().int().min(1)),
        limit: z.preprocess(defaultLimit, z.coerce.number().int().min(1).max(100)),
    }),
});

export type GetMyTripsQuery = z.infer<typeof getMyTripsQuerySchema>['query'];

const ymRegex = /^\d{4}-\d{2}$/;

/**
 * US_16 — Lịch sử vi phạm AI của tài xế đang đăng nhập (không nhận driverId từ client).
 */
export const driverViolationsQuerySchema = z.object({
    query: z.object({
        month: z.string().regex(ymRegex, { message: 'month phải là YYYY-MM (theo lịch VN).' }),
        tripCode: z.preprocess(
            (v) => {
                if (v === undefined || v === null || v === '') {
                    return undefined;
                }
                const s = String(v).trim();
                return s === '' ? undefined : s;
            },
            z.string().min(1).optional(),
        ),
        page: z.preprocess(defaultPage, z.coerce.number().int().min(1)),
        limit: z.preprocess(defaultLimit, z.coerce.number().int().min(1).max(100)),
    }),
});

export type DriverViolationsQuery = z.infer<typeof driverViolationsQuerySchema>['query'];

/** US_17 — `month` tùy chọn; bỏ trống = tháng hiện tại (VN) ở controller. */
export const driverStatisticsQuerySchema = z.object({
    query: z.object({
        month: z.preprocess(
            (v) => (v === undefined || v === null || v === '' ? undefined : String(v).trim()),
            z.string().regex(ymRegex, { message: 'month phải là YYYY-MM.' }).optional(),
        ),
    }),
});

export type DriverStatisticsQuery = z.infer<typeof driverStatisticsQuerySchema>['query'];

const faceNumber = z.number().finite();

export const saveFaceTemplateBodySchema = z.object({
    body: z.object({
        faceEncoding: z.array(faceNumber).length(FACE_ENCODING_DIM),
    }),
});

export const tripCheckinSchema = z.object({
    params: z.object({
        tripId: z.string().uuid(),
    }),
    /** SUCCESS bắt buộc kèm `faceEncoding` để server tự tính Euclidean — không tin matchScore từ client. */
    body: z.discriminatedUnion('result', [
        z.object({
            result: z.literal('SUCCESS'),
            matchScore: z.number().finite(),
            faceEncoding: z.array(faceNumber).length(FACE_ENCODING_DIM),
        }),
        z.object({
            result: z.literal('FAILED'),
            matchScore: z.number().finite(),
        }),
        z.object({
            result: z.literal('LOCKED'),
            matchScore: z.number().finite(),
        }),
    ]),
});

export type SaveFaceTemplateBody = z.infer<typeof saveFaceTemplateBodySchema>['body'];
export type TripCheckinBody = z.infer<typeof tripCheckinSchema>['body'];
