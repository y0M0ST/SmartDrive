import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import { BadRequestException } from '../../common/errors/app-error';
import * as deviceViolationService from './device-violation.service';

export const postDeviceViolation = catchAsync(async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer?.length) {
        throw new BadRequestException('Thiếu file ảnh bằng chứng (field image).');
    }

    const dataRaw = req.body?.data;
    if (typeof dataRaw !== 'string' || dataRaw.trim() === '') {
        throw new BadRequestException('Thiếu metadata (field data — chuỗi JSON).');
    }

    const { message, data } = await deviceViolationService.ingestDeviceViolation(file.buffer, dataRaw);
    res.status(200).json(ServiceResponse.success(message, data));
});
