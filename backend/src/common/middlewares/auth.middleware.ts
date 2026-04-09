import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../types/response';
import { isBlacklisted } from '../utils/tokenBlacklist';
import pool from '../../config/database';

export interface AuthPrincipal {
  id: string;
  username: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
  agency_id: string | null;
  driver_id: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthPrincipal;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có token xác thực',
      error: 'UNAUTHORIZED',
    } as ApiResponse);
  }

  if (isBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã đăng xuất',
      error: 'TOKEN_BLACKLISTED',
    } as ApiResponse);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // 1. Lấy user kèm roles và permissions
    const userResult = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.status,
         COALESCE(
           ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
           '{}'
         ) AS roles,
         COALESCE(
           ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
           '{}'
         ) AS permissions
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = $1 AND u.is_deleted = FALSE
       GROUP BY u.id`,
      [decoded.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại',
        error: 'USER_NOT_FOUND',
      } as ApiResponse);
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin!',
        error: 'ACCOUNT_BLOCKED',
      } as ApiResponse);
    }

    // 2. Lấy agency_id nếu là agency_manager
    let agency_id: string | null = null;
    if (user.roles.includes('agency_manager')) {
      const agencyResult = await pool.query(
        'SELECT id FROM agencies WHERE user_id = $1 AND is_deleted = FALSE',
        [user.id]
      );
      agency_id = agencyResult.rows[0]?.id || null;
    }

    // 3. Lấy driver_id nếu là driver
    let driver_id: string | null = null;
    if (user.roles.includes('driver')) {
      const driverResult = await pool.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [user.id]
      );
      driver_id = driverResult.rows[0]?.id || null;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: user.roles,
      permissions: user.permissions,
      agency_id,
      driver_id,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
      error: 'INVALID_TOKEN',
    } as ApiResponse);
  }
};

// Middleware check permission linh hoạt
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
        error: 'FORBIDDEN',
      } as ApiResponse);
    }
    next();
  };
};

// Middleware check role
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const hasRole = roles.some(role => req.user?.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập',
        error: 'FORBIDDEN',
      } as ApiResponse);
    }
    next();
  };
};

// Shortcut middlewares thường dùng
export const requireSuperAdmin = requireRole('super_admin');
export const requireManagement = requireRole('super_admin', 'agency_manager');