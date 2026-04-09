import { Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  changePasswordService,
  forgotPasswordService,
  loginService,
  logoutService,
  resetPasswordService,
} from './auth.service';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);

    switch (result.code) {
      case 'INVALID_CREDENTIALS':
        return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác', error: 'INVALID_CREDENTIALS' } as ApiResponse);
      case 'ACCOUNT_BANNED':
        return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị cấm, vui lòng liên hệ Admin!', error: 'ACCOUNT_BANNED' } as ApiResponse);
      case 'ACCOUNT_INACTIVE':
        return res.status(403).json({ success: false, message: 'Tài khoản của bạn không còn hoạt động', error: 'ACCOUNT_INACTIVE' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const logout = (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] as string;
    logoutService(token);
    return res.status(200).json({ success: true, message: 'Đăng xuất thành công' } as ApiResponse);
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { old_password, new_password } = req.body;
    const result = await changePasswordService(req.user!.id, old_password, new_password);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại', error: 'NOT_FOUND' } as ApiResponse);
      case 'ACCOUNT_BLOCKED':
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa', error: 'ACCOUNT_BLOCKED' } as ApiResponse);
      case 'WRONG_OLD_PASSWORD':
        return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác', error: 'WRONG_OLD_PASSWORD' } as ApiResponse);
      default:
        const token = req.headers.authorization?.split(' ')[1];
        if (token) logoutService(token);
        return res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' } as ApiResponse);
    }
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordService(email);

    switch (result.code) {
      case 'EMAIL_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống. Vui lòng liên hệ Admin', error: 'EMAIL_NOT_FOUND' } as ApiResponse);
      case 'ACCOUNT_BLOCKED':
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa', error: 'ACCOUNT_BLOCKED' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Mã OTP đã được gửi về email của bạn, có hiệu lực 15 phút' } as ApiResponse);
    }
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, new_password } = req.body;
    const result = await resetPasswordService(email, otp, new_password);

    switch (result.code) {
      case 'EMAIL_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống', error: 'EMAIL_NOT_FOUND' } as ApiResponse);
      case 'ACCOUNT_BLOCKED':
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa', error: 'ACCOUNT_BLOCKED' } as ApiResponse);
      case 'OTP_NOT_FOUND':
        return res.status(400).json({ success: false, message: 'Chưa có yêu cầu đặt lại mật khẩu cho email này', error: 'OTP_NOT_FOUND' } as ApiResponse);
      case 'INVALID_OTP':
        return res.status(400).json({ success: false, message: 'Mã OTP không chính xác', error: 'INVALID_OTP' } as ApiResponse);
      case 'OTP_EXPIRED':
        return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn, vui lòng yêu cầu gửi lại', error: 'OTP_EXPIRED' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' } as ApiResponse);
    }
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};