import { z } from 'zod';
import { ViolationType } from '../../common/constants/enums';
import { toVNDateString } from '../../common/utils/vn-timezone';

const violationTypeEnum = z.enum([ViolationType.DROWSY, ViolationType.DISTRACTED]);

export const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Chuỗi `YYYY-MM-DD` (theo lịch VN nếu gửi datetime) — dùng thống nhất với `vnDayStartIsoDate` / `vnDayEndIsoDate`.
 */
const parseQueryDateOptional = (val: unknown): unknown => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'string' && dateOnlyRegex.test(val)) return val;
    if (val instanceof Date) {
        if (Number.isNaN(val.getTime())) return val;
        return toVNDateString(val);
    }
    if (typeof val === 'string') {
        const parsed = new Date(val);
        if (Number.isNaN(parsed.getTime())) return val;
        return toVNDateString(parsed);
    }
    if (typeof val === 'number') {
        const parsed = new Date(val);
        if (Number.isNaN(parsed.getTime())) return val;
        return toVNDateString(parsed);
    }
    return val;
};

const parseIsReadOptional = (val: unknown): unknown => {
    if (val === undefined || val === null || val === '') return undefined;
    if (val === true || val === false) return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
};

const defaultPage = (v: unknown) => (v === undefined || v === null || v === '' ? 1 : v);
const defaultLimit = (v: unknown) => (v === undefined || v === null || v === '' ? 20 : v);

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const getAgencyViolationsQuerySchema = z.object({
    query: z
        .object({
            page: z.preprocess(defaultPage, z.coerce.number().int().min(1)),
            limit: z.preprocess(defaultLimit, z.coerce.number().int().min(1).max(100)),
            startDate: z.preprocess(
                parseQueryDateOptional,
                z
                    .string()
                    .regex(dateOnlyRegex, { message: 'startDate phải là YYYY-MM-DD hoặc datetime hợp lệ.' })
                    .optional(),
            ),
            endDate: z.preprocess(
                parseQueryDateOptional,
                z
                    .string()
                    .regex(dateOnlyRegex, { message: 'endDate phải là YYYY-MM-DD hoặc datetime hợp lệ.' })
                    .optional(),
            ),
            driverId: z.preprocess(emptyToUndefined, z.string().uuid('driverId không hợp lệ').optional()),
            vehicleId: z.preprocess(emptyToUndefined, z.string().uuid('vehicleId không hợp lệ').optional()),
            type: z.preprocess(emptyToUndefined, violationTypeEnum.optional()),
            isRead: z.preprocess(parseIsReadOptional, z.boolean().optional()),
        })
        .superRefine((q, ctx) => {
            const hasStart = q.startDate !== undefined;
            const hasEnd = q.endDate !== undefined;
            if (hasStart !== hasEnd) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Phải gửi cả startDate và endDate, hoặc bỏ trống cả hai (mặc định: hôm nay theo giờ Việt Nam).',
                    path: hasStart ? ['endDate'] : ['startDate'],
                });
                return;
            }
            if (hasStart && hasEnd && q.startDate! > q.endDate!) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'startDate không được sau endDate.',
                    path: ['endDate'],
                });
            }
        }),
});

export type GetAgencyViolationsQuery = z.infer<typeof getAgencyViolationsQuerySchema>['query'];
