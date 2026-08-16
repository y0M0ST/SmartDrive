import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import type { JwtPayload } from '../../utils/jwtHelper';
import * as tripTrackingService from './trip-tracking.service';

export const getActiveTracking = catchAsync(async (req: Request, res: Response) => {
    const user = (req as Request & { user: JwtPayload }).user;
    const agencyId = user.agency_id as string;
    const trips = await tripTrackingService.listActiveTripsWithLatestGps(agencyId);
    res.status(200).json(ServiceResponse.success('Danh sach chuyen dang IN_PROGRESS.', { trips }));
});
