import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phoneRegex = /^(0|\+84)\d{9,10}$/;

const validateAgencyFields = (
  payload: Record<string, any>,
  res: Response,
  isCreate: boolean
) => {
  const requiredFields = ['code', 'name'];

  if (isCreate) {
    const missingField = requiredFields.find((field) => !payload[field]);
    if (missingField) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin đại lý',
        error: 'MISSING_FIELDS',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.contact_phone) {
    const normalizedPhone = payload.contact_phone.toString().trim().replace(/\s+/g, '');
    if (!phoneRegex.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: 'Số điện thoại đại lý không hợp lệ',
        error: 'INVALID_CONTACT_PHONE',
      } as ApiResponse);
      return false;
    }
  }

  return true;
};

export const validateAgencyId = (req: Request, res: Response, next: NextFunction) => {
  const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(agencyId)) {
    return res.status(400).json({
      success: false,
      message: 'ID đại lý không hợp lệ',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateAgency = (req: Request, res: Response, next: NextFunction) => {
  if (!validateAgencyFields(req.body, res, true)) return;
  next();
};

export const validateUpdateAgency = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['code', 'name', 'address', 'contact_phone'];
  const hasAtLeastOneField = allowedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field));

  if (!hasAtLeastOneField) {
    return res.status(400).json({
      success: false,
      message: 'Không có dữ liệu để cập nhật đại lý',
      error: 'EMPTY_UPDATE_PAYLOAD',
    } as ApiResponse);
  }

  if (!validateAgencyFields(req.body, res, false)) return;
  next();
};