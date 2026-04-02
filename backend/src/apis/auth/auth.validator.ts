import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

const validatePasswordStrength = (
  password: string,
  res: Response
): boolean => {
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt như @, ! hoặc #',
      error: 'WEAK_PASSWORD'
    } as ApiResponse);
    return false;
  }
  return true;
};

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

  if (!validatePasswordStrength(new_password, res)) return;

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

  if (!validatePasswordStrength(new_password, res)) return;

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu xác nhận không khớp',
      error: 'PASSWORD_MISMATCH'
    } as ApiResponse);
  }

  next();
};