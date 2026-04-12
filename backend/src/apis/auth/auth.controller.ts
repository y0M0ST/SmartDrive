import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as authService from './auth.service';

const userIdFromReq = (req: Request) => (req as unknown as { user: { id: string } }).user.id;

export const loginController = catchAsync(async (req: Request, res: Response) => {
    // Bắt IP và User-Agent để lưu log bảo mật
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(req.body, ipAddress, userAgent);

    res.status(200).json(
        ServiceResponse.success('Đăng nhập thành công', result)
    );
});

export const logoutController = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw new Error('Thiếu Refresh Token!');
    }

    // Gọi Service để xử lý gạch bỏ phiên đăng nhập
    await authService.logout(refreshToken);

    // Trả về JSON thành công để Frontend yên tâm clear Local Storage và Redirect
    res.status(200).json(
        ServiceResponse.success('Đăng xuất thành công, hẹn gặp lại!')
    );
});

export const changePasswordController = catchAsync(async (req: Request, res: Response) => {
    // GIẢ ĐỊNH: Bồ đã có authMiddleware gắn thông tin giải mã JWT vào req.user
    const userId = userIdFromReq(req);

    await authService.changePassword(userId, req.body);

    res.status(200).json(ServiceResponse.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'));
});

export const getMeController = catchAsync(async (req: Request, res: Response) => {
    const data = await authService.getMe(userIdFromReq(req));
    res.status(200).json(ServiceResponse.success('OK', data));
});

export const patchMeProfileController = catchAsync(async (req: Request, res: Response) => {
    const data = await authService.updateMyProfile(userIdFromReq(req), req.body);
    res.status(200).json(ServiceResponse.success('Cập nhật họ tên thành công.', data));
});

export const requestContactChangeController = catchAsync(async (req: Request, res: Response) => {
    const data = await authService.requestProfileContactChange(userIdFromReq(req), req.body);
    res.status(200).json(ServiceResponse.success(data.message, data));
});

export const verifyContactChangeController = catchAsync(async (req: Request, res: Response) => {
    const data = await authService.verifyProfileContactChange(userIdFromReq(req), req.body);
    res.status(200).json(ServiceResponse.success('Cập nhật email / số điện thoại thành công.', data));
});

export const forgotPasswordController = catchAsync(async (req: Request, res: Response) => {
    // Dù email sai hay đúng, mình vẫn trả về 1 câu chung chung để chống Hacker dò email hệ thống
    res.status(200).json(ServiceResponse.success('Nếu email hợp lệ, hệ thống đã gửi đường dẫn khôi phục. Vui lòng kiểm tra hộp thư.'));
});

export const resetPasswordController = catchAsync(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);

    res.status(200).json(ServiceResponse.success('Đặt lại mật khẩu thành công! Giờ bạn có thể đăng nhập.'));
});