import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phoneRegex = /^(0|\+84)[0-9]{8,10}$/;
const validStatuses = ['active', 'on_trip', 'inactive', 'banned'];
const validLicenseTypes = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F'];

export const validateDriverId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, message: 'ID tài xế không hợp lệ', error: 'INVALID_DRIVER_ID' } as ApiResponse);
  }
  next();
};

export const validateCreateDriver = (req: Request, res: Response, next: NextFunction) => {
  const { full_name, phone, identity_card, license_number, license_type, license_expiry } = req.body;

  if (!full_name?.trim() || !phone?.trim() || !identity_card?.trim() || !license_number?.trim() || !license_type?.trim() || !license_expiry) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin tài xế', error: 'MISSING_FIELDS' } as ApiResponse);
  }

  if (!phoneRegex.test(phone.trim())) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ', error: 'INVALID_PHONE' } as ApiResponse);
  }

  if (!validLicenseTypes.includes(license_type.trim().toUpperCase())) {
    return res.status(400).json({ success: false, message: `Hạng bằng lái không hợp lệ. Hợp lệ: ${validLicenseTypes.join(', ')}`, error: 'INVALID_LICENSE_TYPE' } as ApiResponse);
  }

  if (isNaN(Date.parse(license_expiry))) {
    return res.status(400).json({ success: false, message: 'Ngày hết hạn bằng lái không đúng định dạng', error: 'INVALID_DATE_FORMAT' } as ApiResponse);
  }

  next();
};

export const validateUpdateDriver = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['full_name', 'phone', 'identity_card', 'license_number', 'license_type', 'license_expiry', 'face_encoding', 'status', 'agency_id'];
  const hasField = allowedFields.some(f => Object.prototype.hasOwnProperty.call(req.body, f));

  if (!hasField) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật', error: 'EMPTY_UPDATE_PAYLOAD' } as ApiResponse);
  }

  if (req.body.phone && !phoneRegex.test(req.body.phone.trim())) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ', error: 'INVALID_PHONE' } as ApiResponse);
  }

  if (req.body.status && !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ. Hợp lệ: ${validStatuses.join(', ')}`, error: 'INVALID_STATUS' } as ApiResponse);
  }

  next();
};

export const validateListDrivers = (req: Request, res: Response, next: NextFunction) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);

  if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json({ success: false, message: 'page và limit phải là số nguyên dương', error: 'INVALID_PAGINATION' } as ApiResponse);
  }

  if (req.query.agency_id && !uuidRegex.test(req.query.agency_id.toString())) {
    return res.status(400).json({ success: false, message: 'ID đại lý không hợp lệ', error: 'INVALID_AGENCY_ID' } as ApiResponse);
  }

  next();
};