"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.logoutSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string()
            .trim()
            .email({ message: 'Email khong dung dinh dang' }),
        password: zod_1.z.string().min(1, { message: 'Vui lòng nhập đầy đủ Email và Mật khẩu' }),
    }),
});
exports.logoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, { message: 'Thiếu Refresh Token để đăng xuất!' }),
    }),
});
// 1. Form Đổi mật khẩu
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        oldPassword: zod_1.z.string().min(1, { message: 'Vui lòng nhập mật khẩu cũ' }),
        newPassword: zod_1.z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
        confirmNewPassword: zod_1.z.string()
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Xác nhận mật khẩu không khớp",
        path: ["confirmNewPassword"]
    }).refine((data) => data.oldPassword !== data.newPassword, {
        message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
        path: ["newPassword"]
    })
});
// 2. Form Quên mật khẩu (Gửi email)
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email({ message: 'Email không đúng định dạng' }),
    })
});
// 3. Form Đặt lại mật khẩu (Nhấn từ link email)
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, { message: 'Thiếu token khôi phục' }),
        newPassword: zod_1.z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
        confirmNewPassword: zod_1.z.string()
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Xác nhận mật khẩu không khớp",
        path: ["confirmNewPassword"]
    })
});
//# sourceMappingURL=auth.dto.js.map