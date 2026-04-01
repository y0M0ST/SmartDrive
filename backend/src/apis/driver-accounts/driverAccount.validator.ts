import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

const validatePasswordStrength = (password: string, res: Response) => {
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      success: false,
      message: 'Mat khau phai co it nhat 8 ky tu, gom it nhat 1 chu hoa, 1 so va 1 ky tu dac biet nhu @, ! hoac #',
      error: 'WEAK_PASSWORD',
    } as ApiResponse);
    return false;
  }

  return true;
};

const validateEmail = (email: string, res: Response) => {
  if (!emailRegex.test(email.trim().toLowerCase())) {
    res.status(400).json({
      success: false,
      message: 'Email tai khoan tai xe khong dung dinh dang',
      error: 'INVALID_EMAIL',
    } as ApiResponse);
    return false;
  }

  return true;
};

export const validateListDriverAccounts = (req: Request, res: Response, next: NextFunction) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const agencyId = req.query.agency_id?.toString();
  const isActive = req.query.is_active?.toString();

  if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: 'page va limit phai la so nguyen duong',
      error: 'INVALID_PAGINATION',
    } as ApiResponse);
  }

  if (agencyId && !uuidRegex.test(agencyId)) {
    return res.status(400).json({
      success: false,
      message: 'ID dai ly khong hop le',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
  }

  if (isActive !== undefined && !['true', 'false'].includes(isActive)) {
    return res.status(400).json({
      success: false,
      message: 'is_active chi duoc la true hoac false',
      error: 'INVALID_IS_ACTIVE',
    } as ApiResponse);
  }

  next();
};

export const validateDriverAccountId = (req: Request, res: Response, next: NextFunction) => {
  const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(accountId)) {
    return res.status(400).json({
      success: false,
      message: 'ID tai khoan tai xe khong hop le',
      error: 'INVALID_DRIVER_ACCOUNT_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateDriverAccount = (req: Request, res: Response, next: NextFunction) => {
  const { driver_id, email, password, confirm_password } = req.body;

  if (!driver_id || !email || !password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Vui long nhap day du thong tin tai khoan tai xe',
      error: 'MISSING_FIELDS',
    } as ApiResponse);
  }

  if (driver_id && !uuidRegex.test(driver_id)) {
    return res.status(400).json({
      success: false,
      message: 'ID tai xe khong hop le',
      error: 'INVALID_DRIVER_ID',
    } as ApiResponse);
  }

  if (!validateEmail(email, res)) return;
  if (!validatePasswordStrength(password, res)) return;

  if (password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Mat khau xac nhan khong khop',
      error: 'PASSWORD_MISMATCH',
    } as ApiResponse);
  }

  next();
};

export const validateUpdateDriverAccount = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['email', 'is_active', 'must_change_password'];
  const hasAtLeastOneField = allowedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field));

  if (!hasAtLeastOneField) {
    return res.status(400).json({
      success: false,
      message: 'Khong co du lieu de cap nhat',
      error: 'EMPTY_UPDATE_PAYLOAD',
    } as ApiResponse);
  }

  if (req.body.email !== undefined && !validateEmail(req.body.email, res)) return;

  if (req.body.is_active !== undefined && typeof req.body.is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'is_active phai la boolean',
      error: 'INVALID_IS_ACTIVE',
    } as ApiResponse);
  }

  if (req.body.must_change_password !== undefined && typeof req.body.must_change_password !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'must_change_password phai la boolean',
      error: 'INVALID_MUST_CHANGE_PASSWORD',
    } as ApiResponse);
  }

  next();
};

export const validateResetDriverAccountPassword = (req: Request, res: Response, next: NextFunction) => {
  const { new_password, confirm_password } = req.body;

  if (!new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Vui long nhap day du mat khau moi va xac nhan mat khau',
      error: 'MISSING_FIELDS',
    } as ApiResponse);
  }

  if (!validatePasswordStrength(new_password, res)) return;

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Mat khau xac nhan khong khop',
      error: 'PASSWORD_MISMATCH',
    } as ApiResponse);
  }

  next();
};