import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../types/response';
import { isBlacklisted } from '../utils/tokenBlacklist';
import pool from '../../config/database';

export interface AuthRequest extends Request {
  admin?: {
    id:    string;
    email: string;
    role:  string;
    agency_id: string | null;
    agency_name: string | null;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    const adminResult = await pool.query(
      `SELECT a.id, a.email, a.role, a.is_active, a.agency_id, ag.name AS agency_name, ag.status AS agency_status
       FROM admins a
       LEFT JOIN agencies ag ON ag.id = a.agency_id
       WHERE a.id = $1`,
      [decoded.id]
    );

    const admin = adminResult.rows[0];

    if (!admin || !admin.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa hoặc không còn tồn tại',
        error: 'ACCOUNT_DISABLED'
      } as ApiResponse);
    }

    if (admin.role === 'agency_manager' && (!admin.agency_id || admin.agency_status !== 'active')) {
      return res.status(403).json({
        success: false,
        message: 'Đại lý của bạn không còn hoạt động',
        error: 'AGENCY_INACTIVE'
      } as ApiResponse);
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      agency_id: admin.agency_id,
      agency_name: admin.agency_name,
    };
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