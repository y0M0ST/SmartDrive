import { z } from 'zod';

export const postGpsSchema = z.object({
    body: z.object({
        trip_id: z.string().uuid('trip_id phải là UUID hợp lệ'),
        latitude: z.number({ error: 'latitude phải là số' }).min(-90).max(90),
        longitude: z.number({ error: 'longitude phải là số' }).min(-180).max(180),
        speed: z.number({ error: 'speed phải là số' }).min(0),
        heading: z.number().min(0).max(360).nullable().optional(),
        // ISO 8601 từ thiết bị — nếu thiếu thì dùng thời điểm nhận
        recorded_at: z.string().datetime({ offset: true }).optional(),
    }),
    query: z.object({}),
    params: z.object({}),
});

export type PostGpsInput = z.infer<typeof postGpsSchema>['body'];
