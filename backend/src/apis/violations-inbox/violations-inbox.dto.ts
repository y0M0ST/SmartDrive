import { z } from 'zod';

export const violationsUnreadQuerySchema = z.object({
    query: z.object({
        limit: z.preprocess(
            (v) => (v === undefined || v === '' || v === null ? 50 : v),
            z.coerce.number().int().min(1).max(100),
        ),
    }),
});

export const violationAcknowledgeParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('ID vi phạm không hợp lệ'),
    }),
});

export type ViolationsUnreadQuery = z.infer<typeof violationsUnreadQuerySchema>['query'];
