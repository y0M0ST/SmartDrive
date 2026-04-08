import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../types/response';
import { isBlacklisted } from '../utils/tokenBlacklist';
import pool from '../../config/database';

export type AuthAccountType = 'admin' | 'driver';

export interface AuthPrincipal {
  id: string;
  email: string;
  full_name: string;
  role: string;
  account_type: AuthAccountType;
  agency_id: string | null;
  agency_name: string | null;
  driver_id: string | null;
  must_change_password: boolean;
}

export interface AuthRequest extends Request {
  admin?: AuthPrincipal;
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
      message: 'Token không hợp lệ hoặc đã đăng xuất',
      error: 'TOKEN_BLACKLISTED'
    } as ApiResponse);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const accountType: AuthAccountType = decoded.account_type === 'driver' || decoded.role === 'driver'
      ? 'driver'
      : 'admin';

    if (accountType === 'driver') {
      const driverAccountResult = await pool.query(
        `SELECT
           da.id,
           da.username AS email,
           da.is_active,
           da.must_change_password,
           d.id AS driver_id,
           d.full_name,
           d.status AS driver_status,
           d.agency_id,
           ag.name AS agency_name,
           ag.status AS agency_status
         FROM driver_accounts da
         INNER JOIN drivers d ON d.id = da.driver_id
         INNER JOIN agencies ag ON ag.id = d.agency_id
         WHERE da.id = $1`,
        [decoded.id]
      );

      const driverAccount = driverAccountResult.rows[0];

      if (!driverAccount || !driverAccount.is_active || driverAccount.driver_status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin!',
          error: 'ACCOUNT_BLOCKED'
        } as ApiResponse);
      }

      if (!driverAccount.agency_id || driverAccount.agency_status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Đại lý của bạn không còn hoạt động. Vui lòng liên hệ Super Admin',
          error: 'AGENCY_INACTIVE'
        } as ApiResponse);
      }

      req.admin = {
        id: driverAccount.id,
        email: driverAccount.email,
        full_name: driverAccount.full_name,
        role: 'driver',
        account_type: 'driver',
        agency_id: driverAccount.agency_id,
        agency_name: driverAccount.agency_name,
        driver_id: driverAccount.driver_id,
        must_change_password: driverAccount.must_change_password,
      };

      return next();
    }

    const adminResult = await pool.query(
      `SELECT
         a.id,
         a.email,
         a.full_name,
         a.role,
         a.is_active,
         a.agency_id,
         ag.name AS agency_name,
         ag.status AS agency_status
       FROM admins a
       LEFT JOIN agencies ag ON ag.id = a.agency_id
       WHERE a.id = $1`,
      [decoded.id]
    );

    const admin = adminResult.rows[0];

    if (!admin || !admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin!',
        error: 'ACCOUNT_BLOCKED'
      } as ApiResponse);
    }

    if (admin.role === 'agency_manager' && (!admin.agency_id || admin.agency_status !== 'active')) {
      return res.status(403).json({
        success: false,
        message: 'Đại lý của bạn không còn hoạt động. Vui lòng liên hệ Super Admin',
        error: 'AGENCY_INACTIVE'
      } as ApiResponse);
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      account_type: 'admin',
      agency_id: admin.agency_id,
      agency_name: admin.agency_name,
      driver_id: null,
      must_change_password: false,
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

export const requireManagementAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.admin || !['super_admin', 'agency_manager'].includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập API quản trị',
      error: 'FORBIDDEN'
    } as ApiResponse);
  }

  next();
};