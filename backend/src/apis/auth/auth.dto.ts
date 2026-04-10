import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z
            .string()
            .trim()
            .email({ message: 'Email khong dung dinh dang' }),
        password: z.string().min(1, { message: 'Vui lòng nhập đầy đủ Email và Mật khẩu' }),
    }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

export const logoutSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, { message: 'Thiếu Refresh Token để đăng xuất!' }),
    }),
});

export type LogoutInput = z.infer<typeof logoutSchema>['body'];

// 1. Form Đổi mật khẩu
export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(1, { message: 'Vui lòng nhập mật khẩu cũ' }),
        newPassword: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
        confirmNewPassword: z.string()
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Xác nhận mật khẩu không khớp",
        path: ["confirmNewPassword"]
    }).refine((data) => data.oldPassword !== data.newPassword, {
        message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
        path: ["newPassword"]
    })
});

// 2. Form Quên mật khẩu (Gửi email)
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email({ message: 'Email không đúng định dạng' }),
    })
});

// 3. Form Đặt lại mật khẩu (Nhấn từ link email)
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, { message: 'Thiếu token khôi phục' }),
        newPassword: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
        confirmNewPassword: z.string()
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Xác nhận mật khẩu không khớp",
        path: ["confirmNewPassword"]
    })
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];