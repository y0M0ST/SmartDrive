import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ Email và Mật khẩu',
      error: 'MISSING_FIELDS'
    } as ApiResponse);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email không đúng định dạng',
      error: 'INVALID_EMAIL'
    } as ApiResponse);
  }

  next();
};