import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as deviceGpsService from './device-gps.service';
import type { DeviceGpsIngestBody } from './device-gps.dto';

export const postDeviceGps = catchAsync(async (req: Request, res: Response) => {
    const body = req.body as DeviceGpsIngestBody;
    const data = await deviceGpsService.ingestDeviceGps(body);
    res.status(201).json(ServiceResponse.success('Đã ghi nhận điểm GPS.', data));
});
