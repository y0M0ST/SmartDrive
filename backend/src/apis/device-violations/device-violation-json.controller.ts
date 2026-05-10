import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as deviceViolationJsonService from './device-violation-json.service';
import type { DeviceViolationJsonBody } from './device-violation-json.dto';

export const postDeviceViolationJson = catchAsync(async (req: Request, res: Response) => {
    const body = req.body as DeviceViolationJsonBody;
    const { message, data } = await deviceViolationJsonService.ingestDeviceViolationJson(body);
    const status = data.duplicate ? 200 : 201;
    res.status(status).json(ServiceResponse.success(message, data));
});
