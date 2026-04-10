"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeAgencyStatusSchema = exports.updateAgencySchema = exports.createAgencySchema = exports.getAgencyQuerySchema = void 0;
const zod_1 = require("zod");
const AgencyStatusEnum = zod_1.z.enum(['ACTIVE', 'INACTIVE']);
exports.getAgencyQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('10'),
        search: zod_1.z.string().optional(),
        status: AgencyStatusEnum.optional(),
    }),
});
exports.createAgencySchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().trim().min(2, 'Ma nha xe toi thieu 2 ky tu'),
        name: zod_1.z.string().trim().min(2, 'Ten nha xe toi thieu 2 ky tu'),
        address: zod_1.z.string().trim().optional(),
        phone: zod_1.z.string().trim().min(10, 'So dien thoai khong hop le').optional(),
    }),
});
exports.updateAgencySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).optional(),
        address: zod_1.z.string().trim().optional(),
        phone: zod_1.z.string().trim().min(10).optional(),
    }),
});
exports.changeAgencyStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: AgencyStatusEnum,
    }),
});
//# sourceMappingURL=agency.dto.js.map