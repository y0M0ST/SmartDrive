import { z } from 'zod';

const licenseClassSchema = z.enum(['B', 'C', 'D', 'E', 'F'], {
    message: 'Hang bang lai khong hop le',
});

const idCardSchema = z
    .string()
    .regex(/^\d{9,12}$/, 'So CMND/CCCD phai gom 9-12 chu so');

const licenseExpiresSchema = z.coerce
    .date()
    .refine((date) => date > new Date(), {
        message: 'Ngay het han bang lai khong duoc nam trong qua khu',
    });

export const createProfileSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({
        user_id: z.string().uuid('ID user khong hop le'),
        id_card: idCardSchema,
        license_class: licenseClassSchema,
        license_expires_at: licenseExpiresSchema,
    }),
});

export const updateProfileSchema = z.object({
    params: z.object({
        userId: z.string().uuid('ID user khong hop le'),
    }),
    body: z.object({
        id_card: idCardSchema,
        license_class: licenseClassSchema,
        license_expires_at: licenseExpiresSchema,
    }),
});

export const getProfileParamSchema = z.object({
    params: z.object({
        userId: z.string().uuid('ID user khong hop le'),
    }),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];