import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error';
import type { JwtPayload } from '../utils/jwtHelper';

const ROLES = ['AGENCY_ADMIN'] as const;

/**
 * US_10 — Chỉ AGENCY_ADMIN có agency_id.
 * SUPER_ADMIN không dùng các API inbox theo agency.
 */
export const requireAgencyAdminOrDispatcher = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) {
        return next(new AppError('Chua xac thuc.', 401));
    }
    if (user.role === 'SUPER_ADMIN') {
        return next(
            new AppError('Super Admin khong su dung API theo pham vi nha xe.', 403),
        );
    }
    if (!ROLES.includes(user.role as (typeof ROLES)[number])) {
        return next(new AppError('Ban khong co quyen thuc hien thao tac nay.', 403));
    }
    if (!user.agency_id || String(user.agency_id).trim() === '') {
        return next(new AppError('Tai khoan khong gan nha xe.', 403));
    }
    return next();
};
