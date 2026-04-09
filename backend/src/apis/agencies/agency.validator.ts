import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phoneRegex = /^(0|\+84)[0-9]{8,10}$/;

export const validateAgencyId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, message: 'ID đại lý không hợp lệ', error: 'INVALID_AGENCY_ID' } as ApiResponse);
  }
  next();
};

export const validateCreateAgency = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đại lý', error: 'MISSING_FIELDS' } as ApiResponse);
  }
  if (req.body.phone && !phoneRegex.test(req.body.phone.trim())) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ', error: 'INVALID_PHONE' } as ApiResponse);
  }
  if (req.body.user_id && !uuidRegex.test(req.body.user_id)) {
    return res.status(400).json({ success: false, message: 'ID tài khoản quản lý không hợp lệ', error: 'INVALID_USER_ID' } as ApiResponse);
  }
  next();
};

export const validateUpdateAgency = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['name', 'address', 'phone', 'user_id'];
  const hasField = allowedFields.some(f => Object.prototype.hasOwnProperty.call(req.body, f));
  if (!hasField) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật', error: 'EMPTY_UPDATE_PAYLOAD' } as ApiResponse);
  }
  if (req.body.phone && !phoneRegex.test(req.body.phone.trim())) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ', error: 'INVALID_PHONE' } as ApiResponse);
  }
  if (req.body.user_id && !uuidRegex.test(req.body.user_id)) {
    return res.status(400).json({ success: false, message: 'ID tài khoản quản lý không hợp lệ', error: 'INVALID_USER_ID' } as ApiResponse);
  }
  next();
};