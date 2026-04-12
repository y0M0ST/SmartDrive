import { z } from 'zod';

export const getProvincesQuerySchema = z.object({
    query: z.object({
        search: z.string().optional(),
    }),
});

export type GetProvincesQuery = z.infer<typeof getProvincesQuerySchema>['query'];
