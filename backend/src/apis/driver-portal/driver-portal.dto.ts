import { z } from 'zod';

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
