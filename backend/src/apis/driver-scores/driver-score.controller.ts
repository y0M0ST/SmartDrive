import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import type { JwtPayload } from '../../utils/jwtHelper';
import { AppError } from '../../common/errors/app-error';
import * as driverScoreService from './driver-score.service';
import { leaderboardQuerySchema, driverHistoryParamSchema } from './driver-score.dto';

const agencyIdFromUser = (req: Request): string => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user?.agency_id) {
        throw new AppError('Token không hợp lệ.', 401);
    }
    return user.agency_id as string;
};

export const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
    const agencyId = agencyIdFromUser(req);
    const parsed = leaderboardQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    const data = await driverScoreService.getLeaderboardForAgency(agencyId, parsed.query);
    res.status(200).json(ServiceResponse.success('Bảng xếp hạng điểm an toàn.', data));
});

export const getDriverHistory = catchAsync(async (req: Request, res: Response) => {
    const agencyId = agencyIdFromUser(req);
    const parsed = driverHistoryParamSchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    const data = await driverScoreService.getDriverViolationHistory(
        parsed.params.driverId,
        agencyId,
        parsed.query.month,
    );
    res.status(200).json(ServiceResponse.success('Lịch sử vi phạm trong tháng.', data));
});
