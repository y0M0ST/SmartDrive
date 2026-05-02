import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as gpsService from './gps.service';

export const postGps = catchAsync(async (req: Request, res: Response) => {
    const log = await gpsService.saveGpsLog(req.body);
    res.status(200).json(ServiceResponse.success('Đã nhận và lưu tọa độ GPS.', { id: log.id }));
});
