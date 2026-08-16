import { Request, Response } from 'express';
import { ServiceResponse } from '../../models/serviceResponse';
import { catchAsync } from '../../utils/catchAsync';
import * as roleService from './role.service';

export const getRoles = catchAsync(async (_req: Request, res: Response) => {
    const result = await roleService.getRoles();
    res.status(200).json(ServiceResponse.success('Lay danh sach vai tro thanh cong', result));
});

