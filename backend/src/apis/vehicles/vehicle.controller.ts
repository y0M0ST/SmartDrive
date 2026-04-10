import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as vehicleService from './vehicle.service';
import { AppError } from '../../common/errors/app-error';

const getAgencyIdFromRequest = (req: Request) => {
    const user = (req as any).user;
    if (!user?.agency_id) {
        throw new AppError('Ban chua dang nhap hoac token khong hop le.', 401);
    }
    return user.agency_id as string;
};

export const getVehicles = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    const result = await vehicleService.getVehicles(req.query as any, agencyId);
    res.status(200).json(ServiceResponse.success('Lấy danh sách xe thành công', result));
});

export const createVehicle = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    const result = await vehicleService.createVehicle(agencyId, req.body);
    res.status(201).json(ServiceResponse.success('Thêm phương tiện mới thành công', result));
});

export const updateVehicle = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    await vehicleService.updateVehicle(agencyId, req.params.id as string, req.body);
    res.status(200).json(ServiceResponse.success('Cập nhật thông tin xe thành công'));
});

export const changeStatus = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    await vehicleService.changeVehicleStatus(agencyId, req.params.id as string, req.body.status);
    res.status(200).json(ServiceResponse.success('Thay đổi trạng thái xe thành công'));
});

export const deleteVehicle = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyIdFromRequest(req);
    await vehicleService.deleteVehicle(agencyId, req.params.id as string);
    res.status(200).json(ServiceResponse.success('Đã xóa phương tiện khỏi hệ thống'));
});