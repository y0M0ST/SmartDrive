import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../types/response';
import { isBlacklisted } from '../utils/tokenBlacklist';

export interface AuthRequest extends Request {
  admin?: {
    id:    string;
    email: string;
    role:  string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có token xác thực',
      error: 'UNAUTHORIZED'
    } as ApiResponse);
  }

  // Kiểm tra token có trong blacklist không
  if (isBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hiệu lực, vui lòng đăng nhập lại',
      error: 'TOKEN_BLACKLISTED'
    } as ApiResponse);
  }

  try {
    const decoded = jwt.verify(token,process.env.JWT_SECRET as string) as any;
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
      error: 'INVALID_TOKEN'
    } as ApiResponse);
  }
};

export const requireSuperAdmin = (req: AuthRequest,res: Response,next: NextFunction) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền thực hiện thao tác này',
      error: 'FORBIDDEN'
    } as ApiResponse);
  }
  next();
};