import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import { AppError } from '../../common/errors/app-error';
import * as driverPortalService from './driver-portal.service';
import { getMyTripsQuerySchema } from './driver-portal.dto';
import type { SaveFaceTemplateBody, TripCheckinBody } from './driver-portal.dto';

const getDriverUserIdFromJwt = (req: Request) => {
    const user = (req as any).user;
    if (!user?.id) {
        throw new AppError('Bạn chưa đăng nhập hoặc token không hợp lệ.', 401);
    }
    return user.id as string;
};

const parseMyTripsQuery = (req: Request) => {
    const parsed = getMyTripsQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    return parsed.query;
};

export const getMyTrips = catchAsync(async (req: Request, res: Response) => {
    const driverUserId = getDriverUserIdFromJwt(req);
    const q = parseMyTripsQuery(req);
    const result = await driverPortalService.getMyTrips(driverUserId, q);
    res.status(200).json(ServiceResponse.success('Lấy lịch trình chuyến đi của bạn thành công', result));
});

export const saveFaceTemplate = catchAsync(async (req: Request, res: Response) => {
    const driverUserId = getDriverUserIdFromJwt(req);
    const data = await driverPortalService.saveFaceTemplate(driverUserId, req.body as SaveFaceTemplateBody);
    res.status(200).json(ServiceResponse.success('Đã lưu mẫu khuôn mặt thành công.', data));
});

export const getFaceTemplate = catchAsync(async (req: Request, res: Response) => {
    const driverUserId = getDriverUserIdFromJwt(req);
    const data = await driverPortalService.getFaceTemplate(driverUserId);
    res.status(200).json(ServiceResponse.success('Lấy mẫu khuôn mặt thành công.', data));
});

export const checkinTrip = catchAsync(async (req: Request, res: Response) => {
    const driverUserId = getDriverUserIdFromJwt(req);
    const tripId = req.params.tripId as string;
    const outcome = await driverPortalService.checkinTrip(driverUserId, tripId, req.body as TripCheckinBody);
    if (outcome.kind === 'LOCKED') {
        res.status(200).json(ServiceResponse.success(outcome.message, { locked: true, tripId }));
        return;
    }
    res.status(200).json(
        ServiceResponse.success(
            'Điểm danh lên xe thành công. Chuyến đi đã chuyển sang đang thực hiện.',
            outcome.trip,
        ),
    );
});
