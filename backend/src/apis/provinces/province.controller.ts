import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import { getProvinces } from './province.service';

function readSearchQueryParam(query: Request['query']): string | undefined {
    const raw = query.search;
    if (raw === undefined) return undefined;
    if (typeof raw === 'string') return raw;
    return undefined;
}

export const getProvincesHandler = catchAsync(async (req: Request, res: Response) => {
    const search = readSearchQueryParam(req.query);
    const data = getProvinces(search);
    res.status(200).json(ServiceResponse.success('Lấy danh sách tỉnh thành thành công', data));
});
