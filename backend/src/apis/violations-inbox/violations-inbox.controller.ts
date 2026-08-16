import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import type { JwtPayload } from '../../utils/jwtHelper';
import { AppError } from '../../common/errors/app-error';
import * as violationsInboxService from './violations-inbox.service';
import { violationsUnreadQuerySchema, violationAcknowledgeParamSchema } from './violations-inbox.dto';

const agencyIdFromUser = (req: Request): string => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user?.agency_id) {
        throw new AppError('Token không hợp lệ.', 401);
    }
    return user.agency_id as string;
};

const userIdFromUser = (req: Request): string => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user?.id) {
        throw new AppError('Token không hợp lệ.', 401);
    }
    return user.id;
};

export const getUnreadViolations = catchAsync(async (req: Request, res: Response) => {
    const agencyId = agencyIdFromUser(req);
    const parsed = violationsUnreadQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    const data = await violationsInboxService.getUnreadForAgency(agencyId, parsed.query);
    res.status(200).json(ServiceResponse.success('Danh sách vi phạm chưa đọc.', data));
});

export const acknowledgeViolation = catchAsync(async (req: Request, res: Response) => {
    const agencyId = agencyIdFromUser(req);
    const userId = userIdFromUser(req);
    const parsed = violationAcknowledgeParamSchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    await violationsInboxService.acknowledgeViolationForAgency(parsed.params.id, agencyId, userId);
    res.status(200).json(ServiceResponse.success('Đã đánh dấu đã đọc.', { id: parsed.params.id }));
});
