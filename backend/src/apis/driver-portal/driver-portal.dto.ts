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
    body: z.object({
        result: z.enum(['SUCCESS', 'FAILED', 'LOCKED']),
        matchScore: z.number().finite(),
    }),
});

export type SaveFaceTemplateBody = z.infer<typeof saveFaceTemplateBodySchema>['body'];
export type TripCheckinBody = z.infer<typeof tripCheckinSchema>['body'];
