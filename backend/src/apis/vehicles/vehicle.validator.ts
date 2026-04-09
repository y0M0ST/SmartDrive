import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plateRegex = /^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$/i;
const validStatuses = ['available', 'on_trip', 'maintenance', 'retired'];

export const validateVehicleId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, message: 'ID xe khách không hợp lệ', error: 'INVALID_VEHICLE_ID' } as ApiResponse);
  }
  next();
};

export const validateCreateVehicle = (req: Request, res: Response, next: NextFunction) => {
  const { plate_number, model, type, capacity } = req.body;

  if (!plate_number?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập biển số xe', error: 'MISSING_FIELDS' } as ApiResponse);
  }

  if (!plateRegex.test(plate_number.trim().toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Biển số xe không đúng định dạng Việt Nam (VD: 43B-123.45)', error: 'INVALID_PLATE_NUMBER' } as ApiResponse);
  }

  if (capacity !== undefined && (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)) {
    return res.status(400).json({ success: false, message: 'Số chỗ ngồi phải là số nguyên dương', error: 'INVALID_CAPACITY' } as ApiResponse);
  }

  next();
};

export const validateUpdateVehicle = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['plate_number', 'model', 'type', 'capacity', 'status', 'camera_code', 'agency_id'];
  const hasField = allowedFields.some(f => Object.prototype.hasOwnProperty.call(req.body, f));

  if (!hasField) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật', error: 'EMPTY_UPDATE_PAYLOAD' } as ApiResponse);
  }

  if (req.body.plate_number && !plateRegex.test(req.body.plate_number.trim().toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Biển số xe không đúng định dạng Việt Nam', error: 'INVALID_PLATE_NUMBER' } as ApiResponse);
  }

  if (req.body.status && !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ. Hợp lệ: ${validStatuses.join(', ')}`, error: 'INVALID_STATUS' } as ApiResponse);
  }

  if (req.body.capacity !== undefined && (!Number.isInteger(Number(req.body.capacity)) || Number(req.body.capacity) <= 0)) {
    return res.status(400).json({ success: false, message: 'Số chỗ ngồi phải là số nguyên dương', error: 'INVALID_CAPACITY' } as ApiResponse);
  }

  next();
};

export const validateListVehicles = (req: Request, res: Response, next: NextFunction) => {
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