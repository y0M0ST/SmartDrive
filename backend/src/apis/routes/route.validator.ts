import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateRouteId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, message: 'ID tuyến đường không hợp lệ', error: 'INVALID_ROUTE_ID' } as ApiResponse);
  }
  next();
};

export const validateCreateRoute = (req: Request, res: Response, next: NextFunction) => {
  const { name, start_point, end_point } = req.body;

  if (!name?.trim() || !start_point?.trim() || !end_point?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tên, điểm đi và điểm đến', error: 'MISSING_FIELDS' } as ApiResponse);
  }

  if (req.body.distance !== undefined && (isNaN(Number(req.body.distance)) || Number(req.body.distance) <= 0)) {
    return res.status(400).json({ success: false, message: 'Cự ly phải là số lớn hơn 0', error: 'INVALID_DISTANCE' } as ApiResponse);
  }

  if (req.body.estimated_duration !== undefined && (!Number.isInteger(Number(req.body.estimated_duration)) || Number(req.body.estimated_duration) <= 0)) {
    return res.status(400).json({ success: false, message: 'Thời gian ước tính phải là số nguyên dương (phút)', error: 'INVALID_DURATION' } as ApiResponse);
  }

  next();
};

export const validateUpdateRoute = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['name', 'start_point', 'end_point', 'distance', 'estimated_duration'];
  const hasField = allowedFields.some(f => Object.prototype.hasOwnProperty.call(req.body, f));

  if (!hasField) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật', error: 'EMPTY_UPDATE_PAYLOAD' } as ApiResponse);
  }

  if (req.body.distance !== undefined && (isNaN(Number(req.body.distance)) || Number(req.body.distance) <= 0)) {
    return res.status(400).json({ success: false, message: 'Cự ly phải là số lớn hơn 0', error: 'INVALID_DISTANCE' } as ApiResponse);
  }

  if (req.body.estimated_duration !== undefined && (!Number.isInteger(Number(req.body.estimated_duration)) || Number(req.body.estimated_duration) <= 0)) {
    return res.status(400).json({ success: false, message: 'Thời gian ước tính phải là số nguyên dương (phút)', error: 'INVALID_DURATION' } as ApiResponse);
  }

  next();
};