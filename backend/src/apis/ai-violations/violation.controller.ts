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
