import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  admin?: { id: string; role: string; email: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có token xác thực' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
  }
  next();
};