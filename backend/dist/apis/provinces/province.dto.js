"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvincesQuerySchema = void 0;
const zod_1 = require("zod");
exports.getProvincesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=province.dto.js.map