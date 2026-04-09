import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../common/types/response';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
const validStatuses = ['active', 'inactive', 'on_trip', 'banned'];

export const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, message: 'ID tài khoản không hợp lệ', error: 'INVALID_USER_ID' } as ApiResponse);
  }
  next();
};

export const validateCreateUser = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password, role } = req.body;

  if (!username?.trim() || !email?.trim() || !password || !role?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ username, email, password và role', error: 'MISSING_FIELDS' } as ApiResponse);
  }

  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Email không đúng định dạng', error: 'INVALID_EMAIL' } as ApiResponse);
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt', error: 'INVALID_PASSWORD_FORMAT' } as ApiResponse);
  }

  next();
};

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
  const allowedFields = ['username', 'email', 'status'];
  const hasField = allowedFields.some(f => Object.prototype.hasOwnProperty.call(req.body, f));

  if (!hasField) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật', error: 'EMPTY_UPDATE_PAYLOAD' } as ApiResponse);
  }

  if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim())) {
    return res.status(400).json({ success: false, message: 'Email không đúng định dạng', error: 'INVALID_EMAIL' } as ApiResponse);
  }

  if (req.body.status && !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ. Hợp lệ: ${validStatuses.join(', ')}`, error: 'INVALID_STATUS' } as ApiResponse);
  }

  next();
};