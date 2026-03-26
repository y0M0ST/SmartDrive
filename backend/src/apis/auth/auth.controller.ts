import { Request, Response } from 'express';
import { loginService } from './auth.service';
import { ApiResponse } from '../../common/types/response';

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