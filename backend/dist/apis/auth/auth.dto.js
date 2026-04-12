"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactChangeVerifySchema = exports.contactChangeRequestSchema = exports.patchMeProfileSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.logoutSchema = exports.loginSchema = void 0;
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
/** Cập nhật họ tên (không OTP) */
exports.patchMeProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        full_name: zod_1.z.string().min(1, 'Họ tên không được để trống').max(200).trim(),
    }),
});
/** Bước 1: yêu cầu OTP — đổi email (gửi OTP tới email mới) hoặc đổi SĐT (gửi OTP tới email hiện tại) */
exports.contactChangeRequestSchema = zod_1.z.object({
    body: zod_1.z.discriminatedUnion('kind', [
        zod_1.z.object({
            kind: zod_1.z.literal('EMAIL'),
            newEmail: zod_1.z.string().trim().toLowerCase().email('Email không hợp lệ'),
        }),
        zod_1.z.object({
            kind: zod_1.z.literal('PHONE'),
            newPhone: zod_1.z.string().min(10, 'Số điện thoại không hợp lệ').max(20).trim(),
        }),
    ]),
});
/** Bước 2: xác nhận OTP — giá trị mới lấy từ DB (không gửi lại từ client) */
exports.contactChangeVerifySchema = zod_1.z.object({
    body: zod_1.z.object({
        kind: zod_1.z.enum(['EMAIL', 'PHONE']),
        otp: zod_1.z.string().regex(/^\d{6}$/, 'Mã OTP phải gồm đúng 6 chữ số'),
    }),
});
//# sourceMappingURL=auth.dto.js.map