import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const phoneRegex = /^(0|\+84)\d{9,10}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses = ['active', 'on_trip', 'banned'];

const isValidDateString = (value: string) => !Number.isNaN(Date.parse(value));

const isPastDate = (value: string) => {
  const inputDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);
  return inputDate < today;
};

const validateDriverFields = (
  payload: Record<string, any>,
  res: Response,
  isCreate: boolean
) => {
  const requiredFields = ['full_name', 'phone', 'license_number', 'license_expiry_date', 'license_type'];

  if (isCreate) {
    const missingField = requiredFields.find((field) => !payload[field]);
    if (missingField) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin tài xế',
        error: 'MISSING_FIELDS',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.phone) {
    const normalizedPhone = payload.phone.toString().trim().replace(/\s+/g, '');
    if (!phoneRegex.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ',
        error: 'INVALID_PHONE',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.license_expiry_date) {
    if (!isValidDateString(payload.license_expiry_date)) {
      res.status(400).json({
        success: false,
        message: 'Ngày hết hạn bằng lái không hợp lệ',
        error: 'INVALID_LICENSE_EXPIRY_DATE',
      } as ApiResponse);
      return false;
    }

    if (isPastDate(payload.license_expiry_date)) {
      res.status(400).json({
        success: false,
        message: 'Ngày hết hạn bằng lái phải từ hôm nay trở đi',
        error: 'PAST_LICENSE_EXPIRY_DATE',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    res.status(400).json({
      success: false,
      message: 'Trạng thái tài xế không hợp lệ',
      error: 'INVALID_STATUS',
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

  return true;
};

export const validateListDrivers = (req: Request, res: Response, next: NextFunction) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const agencyId = req.query.agency_id?.toString();
  const status = req.query.status?.toString();

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

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Trạng thái tài xế không hợp lệ',
      error: 'INVALID_STATUS',
    } as ApiResponse);
  }

  next();
};

export const validateDriverId = (req: Request, res: Response, next: NextFunction) => {
  const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(driverId)) {
    return res.status(400).json({
      success: false,
      message: 'ID tài xế không hợp lệ',
      error: 'INVALID_DRIVER_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateDriver = (req: Request, res: Response, next: NextFunction) => {
  if (!validateDriverFields(req.body, res, true)) return;
  next();
};

export const validateUpdateDriver = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = [
    'full_name',
    'phone',
    'license_number',
    'license_expiry_date',
    'license_type',
    'face_image_url',
    'status',
    'agency_id',
  ];
  const hasAtLeastOneField = allowedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field));

  if (!hasAtLeastOneField) {
    return res.status(400).json({
      success: false,
      message: 'Không có dữ liệu để cập nhật',
      error: 'EMPTY_UPDATE_PAYLOAD',
    } as ApiResponse);
  }

  if (!validateDriverFields(req.body, res, false)) return;
  next();
};