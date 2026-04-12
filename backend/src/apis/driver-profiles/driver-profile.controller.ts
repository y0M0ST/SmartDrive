import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as profileService from './driver-profile.service';
import { AppError } from '../../common/errors/app-error';

const getActor = (req: Request) => {
    const user = (req as any).user;
    return {
        id: user?.id as string,
        role: user?.role as string,
        agency_id: (user?.agency_id as string | null) ?? null,
    };
};

export const createProfile = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    const bodyUserId = req.body.user_id as string;

    if (!bodyUserId) {
        throw new AppError('Thieu user_id trong body.', 400);
    }

    const result = await profileService.createProfile(
        getActor(req),
        bodyUserId,
        req.body,
        files,
    );

    res.status(201).json(
        ServiceResponse.success(
            'Da tao ho so tai xe va dong bo du lieu nhan dien',
            result,
        ),
    );
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    const result = await profileService.updateProfile(
        getActor(req),
        req.params.userId as string,
        req.body,
        files,
    );

    res.status(200).json(
        ServiceResponse.success(
            'Da cap nhat ho so tai xe va dong bo du lieu nhan dien',
            result,
        ),
    );
});

export const getProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await profileService.getProfileInfo(
        req.params.userId as string,
        getActor(req),
    );
    if (!result) throw new AppError('Tai xe nay chua co ho so.', 404);

    res.status(200).json(ServiceResponse.success('Lấy hồ sơ thành công', result));
});