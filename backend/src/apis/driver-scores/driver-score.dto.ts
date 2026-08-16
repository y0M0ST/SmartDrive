import { z } from 'zod';

const ymRegex = /^\d{4}-\d{2}$/;

export const leaderboardQuerySchema = z.object({
    query: z.object({
        month: z
            .string()
            .regex(ymRegex, { message: 'month phải là YYYY-MM (theo lịch VN khi mặc định).' })
            .optional(),
        sort: z.enum(['asc', 'desc']).optional().default('desc'),
    }),
});

export const driverHistoryParamSchema = z.object({
    params: z.object({
        driverId: z.string().uuid('driverId không hợp lệ'),
    }),
    query: z.object({
        month: z.string().regex(ymRegex, { message: 'month phải là YYYY-MM' }),
    }),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>['query'];
