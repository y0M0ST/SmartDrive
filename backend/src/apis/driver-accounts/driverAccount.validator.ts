import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { driver_id, email } = req.body;

  if (!driver_id || !email) {
    return res.status(400).json({
      success: false,
      message: 'Vui long nhap day du thong tin tai khoan tai xe (driver_id, email)',
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

  next();
};

export const validateUpdateDriverAccount = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['email', 'is_active'];
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

  next();
};

export const validateResetDriverAccountPassword = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const validateUpdateMyEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Vui long nhap email moi',
      error: 'MISSING_FIELDS',
    } as ApiResponse);
  }

  if (!validateEmail(email, res)) return;

  next();
};