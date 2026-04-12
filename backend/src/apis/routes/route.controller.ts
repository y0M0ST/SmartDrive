import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as routeService from './route.service';
import { AppError } from '../../common/errors/app-error';

const getAgencyIdFromRequest = (req: Request) => {
    const user = (req as any).user;
    if (!user?.agency_id) {
        throw new AppError('Ban chua dang nhap hoac token khong hop le.', 401);
    }
    return user.agency_id as string;
};

export const getRoutes = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    const result = await routeService.getRoutes(req.query as any, agencyId);
    res.status(200).json(ServiceResponse.success('Lấy danh sách tuyến đường thành công', result));
});

export const createRoute = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    const result = await routeService.createRoute(agencyId, req.body);
    res.status(201).json(ServiceResponse.success('Thêm tuyến đường mới thành công', result));
});

export const updateRoute = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    await routeService.updateRoute(agencyId, req.params.id as string, req.body);
    res.status(200).json(ServiceResponse.success('Cập nhật tuyến đường thành công'));
});

export const changeStatus = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    await routeService.changeRouteStatus(agencyId, req.params.id as string, req.body.status);
    res.status(200).json(ServiceResponse.success('Thay đổi trạng thái tuyến đường thành công'));
});

export const deleteRoute = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    await routeService.deleteRoute(agencyId, req.params.id as string);
    res.status(200).json(ServiceResponse.success('Đã xóa tuyến đường khỏi hệ thống'));
});