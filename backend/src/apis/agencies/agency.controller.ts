import { Request, Response } from 'express';
import { ServiceResponse } from '../../models/serviceResponse';
import { catchAsync } from '../../utils/catchAsync';
import * as agencyService from './agency.service';

const getActor = (req: Request) => {
    const user = (req as any).user;
    return {
        id: user?.id as string,
        role: user?.role as string,
        agency_id: (user?.agency_id as string | null) ?? null,
    };
};

export const getAgencies = catchAsync(async (req: Request, res: Response) => {
    const result = await agencyService.getAgencies(req.query as any, getActor(req));
    res.status(200).json(ServiceResponse.success('Lay danh sach nha xe thanh cong', result));
});

export const createAgency = catchAsync(async (req: Request, res: Response) => {
    const result = await agencyService.createAgency(req.body, getActor(req));
    res.status(201).json(ServiceResponse.success('Tao nha xe thanh cong', result));
});

export const updateAgency = catchAsync(async (req: Request, res: Response) => {
    await agencyService.updateAgency(req.params.id as string, req.body, getActor(req));
    res.status(200).json(ServiceResponse.success('Cap nhat nha xe thanh cong'));
});

export const changeAgencyStatus = catchAsync(async (req: Request, res: Response) => {
    await agencyService.changeAgencyStatus(
        req.params.id as string,
        req.body.status,
        getActor(req),
    );
    res.status(200).json(ServiceResponse.success('Thay doi trang thai nha xe thanh cong'));
});
