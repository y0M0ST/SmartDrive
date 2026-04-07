import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateRouteId = (req: Request, res: Response, next: NextFunction) => {
  const routeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!uuidRegex.test(routeId)) {
    return res.status(400).json({
      success: false,
      message: 'ID tuyen duong khong hop le',
      error: 'INVALID_ROUTE_ID',
    } as ApiResponse);
  }

  next();
};

export const validateCreateRoute = (req: Request, res: Response, next: NextFunction) => {
  const { name, origin, destination, distance_km, estimated_duration_min } = req.body;

  if (!name || !origin || !destination) {
    return res.status(400).json({
      success: false,
      message: 'Vui long nhap day du ten tuyen, diem di va diem den',
      error: 'MISSING_FIELDS',
    } as ApiResponse);
  }

  if (distance_km !== undefined && distance_km !== null) {
    if (typeof distance_km !== 'number' || distance_km <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cu ly phai la so lon hon 0',
        error: 'INVALID_DISTANCE',
      } as ApiResponse);
    }
  }

  if (estimated_duration_min !== undefined && estimated_duration_min !== null) {
    if (typeof estimated_duration_min !== 'number' || estimated_duration_min <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thoi gian du kien phai la so lon hon 0',
        error: 'INVALID_DURATION',
      } as ApiResponse);
    }
  }

  next();
};

export const validateUpdateRoute = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['name', 'origin', 'destination', 'distance_km', 'estimated_duration_min', 'is_active'];
  const hasAtLeastOneField = allowedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field));

  if (!hasAtLeastOneField) {
    return res.status(400).json({
      success: false,
      message: 'Khong co du lieu de cap nhat tuyen duong',
      error: 'EMPTY_UPDATE_PAYLOAD',
    } as ApiResponse);
  }

  const { distance_km, estimated_duration_min } = req.body;

  if (distance_km !== undefined && distance_km !== null) {
    if (typeof distance_km !== 'number' || distance_km <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cu ly phai la so lon hon 0',
        error: 'INVALID_DISTANCE',
      } as ApiResponse);
    }
  }

  if (estimated_duration_min !== undefined && estimated_duration_min !== null) {
    if (typeof estimated_duration_min !== 'number' || estimated_duration_min <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thoi gian du kien phai la so lon hon 0',
        error: 'INVALID_DURATION',
      } as ApiResponse);
    }
  }

  next();
};
