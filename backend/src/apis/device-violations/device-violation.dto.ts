import { z } from 'zod';
import { ViolationType } from '../../common/constants/enums';

const violationTypeEnum = z.enum([ViolationType.DROWSY, ViolationType.DISTRACTED]);

/**
 * JSON trong form field `data` (multipart).
 * `occurredAt`: chuỗi ISO 8601 (vd. `2026-04-18T12:00:00.000Z`).
 */
export const deviceViolationMetadataSchema = z.object({
    deviceEventId: z.string().min(1).max(255),
    tripId: z.string().uuid(),
    type: violationTypeEnum,
    occurredAt: z.coerce.date(),
    latitude: z.union([z.number().finite(), z.null()]).optional(),
    longitude: z.union([z.number().finite(), z.null()]).optional(),
});

export type DeviceViolationMetadata = z.infer<typeof deviceViolationMetadataSchema>;
