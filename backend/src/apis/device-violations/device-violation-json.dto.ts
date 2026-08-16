import { z } from 'zod';
import { ViolationType } from '../../common/constants/enums';

const violationTypeEnum = z.enum([ViolationType.DROWSY, ViolationType.DISTRACTED]);

/**
 * US_10 — JSON ingest (không multipart). `violation_type` map vào cột `type`.
 * Phải có `image_url` **hoặc** `image_base64` (raw hoặc data URL).
 */
export const deviceViolationJsonBodySchema = z
    .object({
        body: z.object({
            device_event_id: z.string().min(1).max(255),
            trip_id: z.string().uuid(),
            violation_type: violationTypeEnum,
            image_url: z.string().url().optional(),
            image_base64: z.string().min(8).optional(),
            latitude: z.number().finite().nullable().optional(),
            longitude: z.number().finite().nullable().optional(),
            occurred_at: z.coerce.date().optional(),
        }),
    })
    .superRefine((data, ctx) => {
        const b = data.body;
        const hasUrl = Boolean(b.image_url?.trim());
        const hasB64 = Boolean(b.image_base64?.trim());
        if (!hasUrl && !hasB64) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Phai co image_url hoac image_base64.',
                path: ['body', 'image_url'],
            });
        }
        if (hasUrl && hasB64) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Chi gui mot trong hai: image_url hoac image_base64.',
                path: ['body', 'image_base64'],
            });
        }
    });

export type DeviceViolationJsonBody = z.infer<typeof deviceViolationJsonBodySchema>['body'];
