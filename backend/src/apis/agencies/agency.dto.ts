import { z } from 'zod';

const AgencyStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

export const getAgencyQuerySchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
        search: z.string().optional(),
        status: AgencyStatusEnum.optional(),
    }),
});

export const createAgencySchema = z.object({
    body: z.object({
        code: z.string().trim().min(2, 'Ma nha xe toi thieu 2 ky tu'),
        name: z.string().trim().min(2, 'Ten nha xe toi thieu 2 ky tu'),
        address: z.string().trim().optional(),
        phone: z.string().trim().min(10, 'So dien thoai khong hop le').optional(),
    }),
});

export const updateAgencySchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).optional(),
        address: z.string().trim().optional(),
        phone: z.string().trim().min(10).optional(),
    }),
});

export const changeAgencyStatusSchema = z.object({
    body: z.object({
        status: AgencyStatusEnum,
    }),
});

export type GetAgencyQuery = z.infer<typeof getAgencyQuerySchema>['query'];
export type CreateAgencyInput = z.infer<typeof createAgencySchema>['body'];
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>['body'];
