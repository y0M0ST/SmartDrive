import { z } from 'zod';

const currentYear = new Date().getFullYear();

const monthYearSchema = z.object({
    query: z.object({
        month: z
            .string()
            .optional()
            .transform((v) => (v ? parseInt(v, 10) : new Date().getMonth() + 1))
            .refine((v) => v >= 1 && v <= 12, { message: 'month phải từ 1 đến 12' }),
        year: z
            .string()
            .optional()
            .transform((v) => (v ? parseInt(v, 10) : currentYear))
            .refine((v) => v >= 2020 && v <= currentYear + 1, { message: 'year không hợp lệ' }),
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('20'),
    }),
});

export const getScoresSchema = monthYearSchema;
export const recalculateScoresSchema = monthYearSchema;

export type ScoreQuery = z.infer<typeof getScoresSchema>['query'];
