import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const licensePlateRegex = /^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$/i;
const allowedStatuses = ['available', 'on_trip', 'maintenance', 'retired'];

const isValidDateString = (value: string) => !Number.isNaN(Date.parse(value));

const isPastDate = (value: string) => {
  const inputDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);
  return inputDate < today;
};

const validateVehicleFields = (
  payload: Record<string, any>,
  res: Response,
  isCreate: boolean
) => {
  const requiredFields = [
    'license_plate',
    'brand',
    'model',
    'seat_count',
    'vehicle_type',
    'registration_expiry_date',
    'insurance_expiry_date',
  ];

  if (isCreate) {
    const missingField = requiredFields.find((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
    if (missingField) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin xe khách',
        error: 'MISSING_FIELDS',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.license_plate && !licensePlateRegex.test(payload.license_plate.toString().trim().toUpperCase())) {
    res.status(400).json({
      success: false,
      message: 'Biển số xe không đúng định dạng Việt Nam',
      error: 'INVALID_LICENSE_PLATE',
    } as ApiResponse);
    return false;
  }

  if (payload.seat_count !== undefined && (!Number.isInteger(Number(payload.seat_count)) || Number(payload.seat_count) <= 0)) {
    res.status(400).json({
      success: false,
      message: 'Số chỗ phải là số nguyên dương',
      error: 'INVALID_SEAT_COUNT',
    } as ApiResponse);
    return false;
  }

  if (payload.registration_expiry_date) {
    if (!isValidDateString(payload.registration_expiry_date) || isPastDate(payload.registration_expiry_date)) {
      res.status(400).json({
        success: false,
        message: 'Ngày hết hạn đăng kiểm không hợp lệ',
        error: 'INVALID_REGISTRATION_EXPIRY_DATE',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.insurance_expiry_date) {
    if (!isValidDateString(payload.insurance_expiry_date) || isPastDate(payload.insurance_expiry_date)) {
      res.status(400).json({
        success: false,
        message: 'Ngày hết hạn bảo hiểm không hợp lệ',
        error: 'INVALID_INSURANCE_EXPIRY_DATE',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    res.status(400).json({
      success: false,
      message: 'Trạng thái xe khách không hợp lệ',
      error: 'INVALID_STATUS',
    } as ApiResponse);
    return false;
  }

  if (payload.agency_id && !uuidRegex.test(payload.agency_id.toString())) {
    res.status(400).json({
      success: false,
      message: 'ID dai ly khong hop le',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
    return false;
  }

  return true;
};

export const validateListVehicles = (req: Request, res: Response, next: NextFunction) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
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
      message: 'ID dai ly khong hop le',
      error: 'INVALID_AGENCY_ID',
    } as ApiResponse);
  }

  next();
};

export const validateVehicleId = (req: Request, res: Response, next: NextFunction) => {
  const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(vehicleId)) {
    return res.status(400).json({
      success: false,
      message: 'ID xe khách không hợp lệ',
      error: 'INVALID_VEHICLE_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateVehicle = (req: Request, res: Response, next: NextFunction) => {
  if (!validateVehicleFields(req.body, res, true)) return;
  next();
};

export const validateUpdateVehicle = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = [
    'license_plate',
    'brand',
    'model',
    'seat_count',
    'vehicle_type',
    'registration_expiry_date',
    'insurance_expiry_date',
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

  if (!validateVehicleFields(req.body, res, false)) return;
  next();
};