import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import * as userService from './user.service';

const getActor = (req: Request) => {
    const user = (req as any).user;
    return {
        id: user?.id as string,
        role: user?.role as string,
        agency_id: (user?.agency_id as string | null) ?? null,
    };
};

export const getUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await userService.getUsers(req.query as any, getActor(req));
    res.status(200).json(ServiceResponse.success('Lấy danh sách thành công', result));
});

export const createUser = catchAsync(async (req: Request, res: Response) => {
    const result = await userService.createUser(req.body, getActor(req));
    res.status(201).json(ServiceResponse.success('Thêm mới tài khoản thành công', result));
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
    await userService.updateUser(req.params.id as string, req.body, getActor(req));
    res.status(200).json(ServiceResponse.success('Cập nhật thông tin thành công'));
});

export const changeStatus = catchAsync(async (req: Request, res: Response) => {
    await userService.changeUserStatus(
        req.params.id as string,
        req.body.status,
        getActor(req),
    );
    res.status(200).json(ServiceResponse.success('Thay đổi trạng thái thành công'));
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id as string, getActor(req));
    res.status(200).json(ServiceResponse.success('Đã xóa tài khoản khỏi hệ thống'));
});