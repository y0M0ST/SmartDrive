import { z } from 'zod';
import { ViolationType } from '../../common/constants/enums';

const ymd = /^\d{4}-\d{2}-\d{2}$/;

export const agencyReportQuerySchema = z
    .object({
        query: z.object({
            startDate: z.string().regex(ymd, { message: 'startDate phải là YYYY-MM-DD (lịch VN).' }),
            endDate: z.string().regex(ymd, { message: 'endDate phải là YYYY-MM-DD (lịch VN).' }),
            driverId: z.string().uuid('driverId không hợp lệ').optional(),
            violationType: z.enum([ViolationType.DROWSY, ViolationType.DISTRACTED]).optional(),
        }),
    })
    .refine((o) => o.query.startDate <= o.query.endDate, {
        message: 'startDate không được sau endDate.',
        path: ['query', 'endDate'],
    });

export type AgencyReportQuery = z.infer<typeof agencyReportQuerySchema>['query'];
