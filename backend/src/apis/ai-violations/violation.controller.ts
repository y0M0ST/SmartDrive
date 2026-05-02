import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import { AppError } from '../../common/errors/app-error';
import * as violationService from './violation.service';
import { getAgencyViolationsQuerySchema } from './violation.dto';

const getAgencyIdFromAgencyAdmin = (req: Request) => {
    const user = (req as any).user;
    if (!user?.agency_id) {
        throw new AppError('Bạn chưa đăng nhập hoặc token không hợp lệ.', 401);
    }
    return user.agency_id as string;
};

const getUserId = (req: Request): string => {
    const user = (req as any).user;
    if (!user?.id) throw new AppError('Bạn chưa đăng nhập hoặc token không hợp lệ.', 401);
    return user.id as string;
};

const parseAgencyViolationsQuery = (req: Request) => {
    const parsed = getAgencyViolationsQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    return parsed.query;
};

export const getAgencyViolations = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const query = parseAgencyViolationsQuery(req);
    const result = await violationService.getAgencyViolations(query, agencyId);
    res.status(200).json(ServiceResponse.success('Lấy danh sách vi phạm AI thành công', result));
});

/** GET /api/agencies/violations/unread-count — badge số chưa đọc (US_10) */
export const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const result = await violationService.getUnreadCount(agencyId);
    res.status(200).json(ServiceResponse.success('Lấy số vi phạm chưa đọc thành công', result));
});

/** PATCH /api/agencies/violations/:id/acknowledge — Đã xem (US_10) */
export const acknowledgeViolation = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const userId = getUserId(req);
    const violationId = req.params.id as string;
    const result = await violationService.acknowledgeViolation(violationId, agencyId, userId);
    res.status(200).json(ServiceResponse.success('Đã xác nhận vi phạm thành công', {
        id: result.id,
        is_read: result.is_read,
        acknowledged_by: result.acknowledged_by,
        acknowledged_at: result.acknowledged_at,
    }));
});
