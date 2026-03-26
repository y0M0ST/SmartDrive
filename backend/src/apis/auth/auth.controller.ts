import { Request, Response } from 'express';
import { changePasswordService, loginService , logoutService } from './auth.service';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);

    switch (result.code) {
      case 'INVALID_CREDENTIALS':
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không chính xác',
          error: 'INVALID_CREDENTIALS'
        } as ApiResponse);

      case 'ACCOUNT_DISABLED':
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin',
          error: 'ACCOUNT_DISABLED'
        } as ApiResponse);

      default:
        return res.status(200).json({
          success: true,
          message: 'Đăng nhập thành công',
          data: result.data
        } as ApiResponse);
    }

  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR'
    } as ApiResponse);
  }
};

export const logout = (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] as string;
    logoutService(token);

    return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    } as ApiResponse);

  } catch (err) {
    console.error('[Auth] Logout error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR'
    } as ApiResponse);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { old_password, new_password } = req.body;
    const adminId = req.admin!.id;

    const result = await changePasswordService(adminId, old_password, new_password);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Tai khoan khong ton tai',
          error: 'NOT_FOUND'
        } as ApiResponse);

      case 'WRONG_OLD_PASSWORD':
        return res.status(401).json({
          success: false,
          message: 'Mat khau hien tai khong chinh xac',
          error: 'WRONG_OLD_PASSWORD'
        } as ApiResponse);

      default:
        return res.status(200).json({
          success: true,
          message: 'Doi mat khau thanh cong'
        } as ApiResponse);
    }

  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Loi he thong, vui long thu lai sau',
      error: 'INTERNAL_ERROR'
    } as ApiResponse);
  }
};