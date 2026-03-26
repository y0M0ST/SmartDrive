import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
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

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ thông tin',
      error: 'MISSING_FIELDS'
    } as ApiResponse);
  }

  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có ít nhất 6 ký tự',
      error: 'PASSWORD_TOO_SHORT'
    } as ApiResponse);
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu xác nhận không khớp',
      error: 'PASSWORD_MISMATCH'
    } as ApiResponse);
  }

  if (old_password === new_password) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải khác mật khẩu cũ',
      error: 'SAME_PASSWORD'
    } as ApiResponse);
  }

  next();
};

export const validateForgotPassword = (req: Request,res: Response,next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập email',
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

export const validateResetPassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, otp, new_password, confirm_password } = req.body;

  if (!email || !otp || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ thông tin',
      error: 'MISSING_FIELDS'
    } as ApiResponse);
  }

  if (otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Mã OTP không hợp lệ',
      error: 'INVALID_OTP_FORMAT'
    } as ApiResponse);
  }

  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có ít nhất 6 ký tự',
      error: 'PASSWORD_TOO_SHORT'
    } as ApiResponse);
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu xác nhận không khớp',
      error: 'PASSWORD_MISMATCH'
    } as ApiResponse);
  }

  next();
};