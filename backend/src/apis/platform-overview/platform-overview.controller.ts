import { Request, Response } from 'express';
import { ServiceResponse } from '../../models/serviceResponse';
import { catchAsync } from '../../utils/catchAsync';
import * as platformOverviewService from './platform-overview.service';

export const getOverview = catchAsync(async (_req: Request, res: Response) => {
    const data = await platformOverviewService.getPlatformOverview();
    res.status(200).json(ServiceResponse.success('Lay tong quan he thong thanh cong', data));
});
