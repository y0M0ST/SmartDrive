"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileParamSchema = exports.updateProfileSchema = exports.createProfileSchema = void 0;
const zod_1 = require("zod");
const licenseClassSchema = zod_1.z.enum(['B', 'C', 'D', 'E', 'F'], {
    message: 'Hang bang lai khong hop le',
});
const idCardSchema = zod_1.z
    .string()
    .regex(/^\d{9,12}$/, 'So CMND/CCCD phai gom 9-12 chu so');
const licenseExpiresSchema = zod_1.z.coerce
    .date()
    .refine((date) => date > new Date(), {
    message: 'Ngay het han bang lai khong duoc nam trong qua khu',
});
exports.createProfileSchema = zod_1.z.object({
    params: zod_1.z.object({}).optional(),
    body: zod_1.z.object({
        user_id: zod_1.z.string().uuid('ID user khong hop le'),
        id_card: idCardSchema,
        license_class: licenseClassSchema,
        license_expires_at: licenseExpiresSchema,
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().uuid('ID user khong hop le'),
    }),
    body: zod_1.z.object({
        id_card: idCardSchema,
        license_class: licenseClassSchema,
        license_expires_at: licenseExpiresSchema,
    }),
});
exports.getProfileParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().uuid('ID user khong hop le'),
    }),
});
//# sourceMappingURL=driver-profile.dto.js.map