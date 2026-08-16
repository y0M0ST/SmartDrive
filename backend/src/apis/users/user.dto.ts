import { z } from 'zod';
import { UserStatus } from '../../common/constants/enums';

// 1. Form Thêm mới User
export const createUserSchema = z.object({
    body: z.object({
        full_name: z.string().min(1, 'Họ tên không được để trống'),
        email: z.string().email('Email không hợp lệ'),
        phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
        role_id: z.string().uuid('Vai trò không hợp lệ'),
        agency_id: z.string().uuid('Nhà xe không hợp lệ').nullable().optional(), // Null nếu là Super Admin
    })
});

// 2. Form Cập nhật User (Các trường đều optional vì có thể chỉ sửa 1 thứ)
export const updateUserSchema = z.object({
    body: z.object({
        full_name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(10).optional(),
        role_id: z.string().uuid().optional(),
    })
});

// 3. Form Đổi trạng thái (Khóa/Mở khóa)
export const changeStatusSchema = z.object({
    body: z.object({
        status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.INACTIVE]),
    })
});

// 4. Query Params cho API Get List (Search, Filter, Phân trang)
export const getUserQuerySchema = z.object({
    query: z.object({
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
        search: z.string().optional(),
        agency_id: z.string().uuid().optional(),
        role_id: z.string().uuid().optional(),
        status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.INACTIVE]).optional(),
    })
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>['body'];
export type GetUserQuery = z.infer<typeof getUserQuerySchema>['query'];