import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateAgencyAccountId = (req: Request, res: Response, next: NextFunction) => {
  const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(accountId)) {
    return res.status(400).json({
      success: false,
      message: 'ID tai khoan dai ly khong hop le',
      error: 'INVALID_ACCOUNT_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateAgencyAccount = (req: Request, res: Response, next: NextFunction) => {
  const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(agencyId)) {
    return res.status(400).json({
      success: false,
      message: 'ID dai ly khong hop le',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui long nhap day du email va mat khau',
      error: 'MISSING_FIELDS',
    } as ApiResponse);
  }

  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Email khong hop le',
      error: 'INVALID_EMAIL',
    } as ApiResponse);
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mat khau phai co it nhat 6 ky tu',
      error: 'INVALID_PASSWORD',
    } as ApiResponse);
  }

  next();
};
