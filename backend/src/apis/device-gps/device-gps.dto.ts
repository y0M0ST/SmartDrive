import { z } from 'zod';

export const deviceGpsIngestSchema = z.object({
    body: z.object({
        trip_id: z.string().uuid('trip_id phải là UUID hợp lệ'),
        latitude: z.number().finite(),
        longitude: z.number().finite(),
        speed: z.number().nonnegative(),
        heading: z.number().finite().nullable().optional(),
    }),
});

export type DeviceGpsIngestBody = z.infer<typeof deviceGpsIngestSchema>['body'];
