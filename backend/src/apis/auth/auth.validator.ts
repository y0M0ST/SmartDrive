// auth.validator.ts
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu', error: 'MISSING_FIELDS' } as ApiResponse);
  }
  next();
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
  const { old_password, new_password, confirm_password } = req.body;
  if (!old_password || !new_password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin', error: 'MISSING_FIELDS' } as ApiResponse);
  }
  if (!PASSWORD_REGEX.test(new_password)) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt', error: 'INVALID_PASSWORD_FORMAT' } as ApiResponse);
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp', error: 'PASSWORD_MISMATCH' } as ApiResponse);
  }
  next();
};

export const validateForgotPassword = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập email', error: 'MISSING_FIELDS' } as ApiResponse);
  }
  next();
};

export const validateResetPassword = (req: Request, res: Response, next: NextFunction) => {
  const { email, otp, new_password, confirm_password } = req.body;
  if (!email || !otp || !new_password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin', error: 'MISSING_FIELDS' } as ApiResponse);
  }
  if (!PASSWORD_REGEX.test(new_password)) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới không đúng định dạng', error: 'INVALID_PASSWORD_FORMAT' } as ApiResponse);
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp', error: 'PASSWORD_MISMATCH' } as ApiResponse);
  }
  next();
};