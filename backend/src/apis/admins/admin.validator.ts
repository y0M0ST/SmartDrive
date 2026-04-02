import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex    = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRegex   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
const allowedRoles = ['super_admin', 'agency_manager'];

// ============================================================
// Helpers
// ============================================================
const validateAdminFields = (
  payload: Record<string, any>,
  res: Response,
  isCreate: boolean
): boolean => {
  if (isCreate) {
    const required = ['email', 'full_name', 'role'];
    const missing  = required.find((f) => !payload[f]);
    if (missing) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin tài khoản',
        error: 'MISSING_FIELDS',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.email) {
    if (!emailRegex.test(payload.email.toString().trim())) {
      res.status(400).json({
        success: false,
        message: 'Email không hợp lệ',
        error: 'INVALID_EMAIL',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.full_name !== undefined && payload.full_name.toString().trim().length < 2) {
    res.status(400).json({
      success: false,
      message: 'Họ tên phải có ít nhất 2 ký tự',
      error: 'INVALID_FULL_NAME',
    } as ApiResponse);
    return false;
  }

  if (payload.role && !allowedRoles.includes(payload.role)) {
    res.status(400).json({
      success: false,
      message: 'Role không hợp lệ',
      error: 'INVALID_ROLE',
    } as ApiResponse);
    return false;
  }

  if (payload.agency_id && !uuidRegex.test(payload.agency_id.toString())) {
    res.status(400).json({
      success: false,
      message: 'ID đại lý không hợp lệ',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
    return false;
  }

  if (payload.password && !passwordRegex.test(payload.password)) {
    res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt như @, ! hoặc #',
      error: 'WEAK_PASSWORD',
    } as ApiResponse);
    return false;
  }

  if (payload.is_active !== undefined && typeof payload.is_active !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'is_active phải là boolean',
      error: 'INVALID_IS_ACTIVE',
    } as ApiResponse);
    return false;
  }

  return true;
};

// ============================================================
// Exported middleware
// ============================================================
export const validateAdminId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID tài khoản không hợp lệ',
      error: 'INVALID_ADMIN_ID',
    } as ApiResponse);
  }
  next();
};

export const validateListAdmins = (req: Request, res: Response, next: NextFunction) => {
  const page     = Number(req.query.page  || 1);
  const limit    = Number(req.query.limit || 10);
  const agencyId = req.query.agency_id?.toString();

  if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: 'page và limit phải là số nguyên dương',
      error: 'INVALID_PAGINATION',
    } as ApiResponse);
  }

  if (agencyId && !uuidRegex.test(agencyId)) {
    return res.status(400).json({
      success: false,
      message: 'ID đại lý không hợp lệ',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!validateAdminFields(req.body, res, true)) return;
  next();
};

export const validateUpdateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['email', 'full_name', 'role', 'agency_id', 'is_active'];
  const hasAtLeastOne = allowedFields.some((f) =>
    Object.prototype.hasOwnProperty.call(req.body, f)
  );

  if (!hasAtLeastOne) {
    return res.status(400).json({
      success: false,
      message: 'Không có dữ liệu để cập nhật',
      error: 'EMPTY_UPDATE_PAYLOAD',
    } as ApiResponse);
  }

  if (!validateAdminFields(req.body, res, false)) return;
  next();
};