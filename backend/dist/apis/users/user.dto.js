"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserQuerySchema = exports.changeStatusSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../common/constants/enums");
// 1. Form Thêm mới User
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        full_name: zod_1.z.string().min(1, 'Họ tên không được để trống'),
        email: zod_1.z.string().email('Email không hợp lệ'),
        phone: zod_1.z.string().min(10, 'Số điện thoại không hợp lệ'),
        role_id: zod_1.z.string().uuid('Vai trò không hợp lệ'),
        agency_id: zod_1.z.string().uuid('Nhà xe không hợp lệ').nullable().optional(), // Null nếu là Super Admin
    })
});
// 2. Form Cập nhật User (Các trường đều optional vì có thể chỉ sửa 1 thứ)
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        full_name: zod_1.z.string().min(1).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().min(10).optional(),
        role_id: zod_1.z.string().uuid().optional(),
    })
});
// 3. Form Đổi trạng thái (Khóa/Mở khóa)
exports.changeStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum([enums_1.UserStatus.ACTIVE, enums_1.UserStatus.BLOCKED, enums_1.UserStatus.INACTIVE]),
    })
});
// 4. Query Params cho API Get List (Search, Filter, Phân trang)
exports.getUserQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('10'),
        search: zod_1.z.string().optional(),
        agency_id: zod_1.z.string().uuid().optional(),
        role_id: zod_1.z.string().uuid().optional(),
        status: zod_1.z.enum([enums_1.UserStatus.ACTIVE, enums_1.UserStatus.BLOCKED, enums_1.UserStatus.INACTIVE]).optional(),
    })
});
//# sourceMappingURL=user.dto.js.map