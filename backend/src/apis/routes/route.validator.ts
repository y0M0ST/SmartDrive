import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================================
// Helpers
// ============================================================
const validateRouteFields = (
  payload: Record<string, any>,
  res: Response,
  isCreate: boolean
): boolean => {
  if (isCreate) {
    const required = ['name', 'origin', 'destination'];
    const missing  = required.find((f) => !payload[f]?.toString().trim());
    if (missing) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin tuyến đường',
        error: 'MISSING_FIELDS',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.name !== undefined && payload.name.toString().trim().length < 2) {
    res.status(400).json({
      success: false,
      message: 'Tên tuyến đường phải có ít nhất 2 ký tự',
      error: 'INVALID_NAME',
    } as ApiResponse);
    return false;
  }

  if (payload.distance_km !== undefined && payload.distance_km !== null) {
    const dist = Number(payload.distance_km);
    if (Number.isNaN(dist) || dist <= 0) {
      res.status(400).json({
        success: false,
        message: 'Khoảng cách phải là số lớn hơn 0',
        error: 'INVALID_DISTANCE',
      } as ApiResponse);
      return false;
    }
  }

  if (payload.estimated_duration_min !== undefined && payload.estimated_duration_min !== null) {
    const dur = Number(payload.estimated_duration_min);
    if (!Number.isInteger(dur) || dur <= 0) {
      res.status(400).json({
        success: false,
        message: 'Thời gian dự kiến phải là số nguyên dương (phút)',
        error: 'INVALID_DURATION',
      } as ApiResponse);
      return false;
    }
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
export const validateRouteId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID tuyến đường không hợp lệ',
      error: 'INVALID_ROUTE_ID',
    } as ApiResponse);
  }
  next();
};

export const validateListRoutes = (req: Request, res: Response, next: NextFunction) => {
  const page  = Number(req.query.page  || 1);
  const limit = Number(req.query.limit || 10);

  if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: 'page và limit phải là số nguyên dương',
      error: 'INVALID_PAGINATION',
    } as ApiResponse);
  }
  next();
};

export const validateCreateRoute = (req: Request, res: Response, next: NextFunction) => {
  if (!validateRouteFields(req.body, res, true)) return;
  next();
};

export const validateUpdateRoute = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['name', 'origin', 'destination', 'distance_km', 'estimated_duration_min', 'is_active'];
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

  if (!validateRouteFields(req.body, res, false)) return;
  next();
};