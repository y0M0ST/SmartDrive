import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors/app-error';
import type { JwtPayload } from '../../utils/jwtHelper';

const ALLOWED_ROLES = ['AGENCY_ADMIN', 'DISPATCHER'] as const;

/**
 * US_09 — Chỉ AGENCY_ADMIN / DISPATCHER có agency_id mới được xem tracking.
 * SUPER_ADMIN tuyệt đối không dùng API này (tránh lộ trải nghiệm multi-tenant sai kỳ vọng).
 */
export const requireAgencyTrackingAccess = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) {
        return next(new AppError('Chua xac thuc.', 401));
    }
    if (user.role === 'SUPER_ADMIN') {
        return next(
            new AppError(
                'Super Admin khong su dung API active-tracking. Vui long dung cac man tong hop / bao cao khac.',
                403,
            ),
        );
    }
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
        return next(new AppError('Ban khong co quyen thuc hien thao tac nay.', 403));
    }
    if (!user.agency_id || user.agency_id.trim() === '') {
        return next(new AppError('Tai khoan khong gan nha xe — khong the truy van tracking.', 403));
    }
    return next();
};
