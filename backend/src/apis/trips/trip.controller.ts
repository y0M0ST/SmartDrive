import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as tripService from './trip.service';
import { AppError } from '../../common/errors/app-error';
import { availableSlotQuerySchema } from './trip.dto';

const getAgencyIdFromAgencyAdmin = (req: Request) => {
    const user = (req as any).user;
    if (!user?.agency_id) {
        throw new AppError('Bạn chưa đăng nhập hoặc token không hợp lệ.', 401);
    }
    return user.agency_id as string;
};

export const getTrips = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const result = await tripService.getTrips(req.query as any, agencyId);
    res.status(200).json(ServiceResponse.success('Lấy danh sách chuyến đi thành công', result));
});

const parseAvailableSlotQuery = (req: Request) => {
    const parsed = availableSlotQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    return parsed.query;
};

export const getAvailableDrivers = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const slot = parseAvailableSlotQuery(req);
    const data = await tripService.getAvailableDrivers(agencyId, slot);
    res.status(200).json(ServiceResponse.success('Lấy danh sách tài xế khả dụng thành công', data));
});

export const getAvailableVehicles = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const slot = parseAvailableSlotQuery(req);
    const data = await tripService.getAvailableVehicles(agencyId, slot);
    res.status(200).json(ServiceResponse.success('Lấy danh sách xe khả dụng thành công', data));
});

export const getTripDetail = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const result = await tripService.getTripDetail(req.params.id as string, agencyId);
    res.status(200).json(ServiceResponse.success('Lấy chi tiết chuyến đi thành công', result));
});

export const createTrip = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromAgencyAdmin(req);
    const result = await tripService.createTrip(req.body, agencyId);
    res.status(201).json(ServiceResponse.success('Tạo chuyến đi mới thành công', result));
});
