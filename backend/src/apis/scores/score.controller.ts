import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import { AppError } from '../../common/errors/app-error';
import * as scoreService from './score.service';

const getAgencyId = (req: Request): string => {
    const user = (req as any).user;
    if (!user?.agency_id) throw new AppError('Bạn chưa đăng nhập hoặc token không hợp lệ.', 401);
    return user.agency_id as string;
};

/** GET /api/agencies/scores?month=&year=&page=&limit= */
export const getScores = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyId(req);
    const q = req.query as any;
    const month = parseInt(q.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(q.year, 10) || new Date().getFullYear();
    const page = parseInt(q.page, 10) || 1;
    const limit = parseInt(q.limit, 10) || 20;
    const result = await scoreService.getScores(agencyId, { month, year, page, limit } as any);
    res.status(200).json(ServiceResponse.success('Lấy bảng điểm an toàn thành công', result));
});

/** POST /api/agencies/scores/recalculate?month=&year= */
export const recalculateScores = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyId(req);
    const q = req.query as any;
    const month = parseInt(q.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(q.year, 10) || new Date().getFullYear();
    const count = await scoreService.recalculateScores(agencyId, month, year);
    res.status(200).json(
        ServiceResponse.success(`Đã tính lại điểm cho ${count} tài xế tháng ${month}/${year}`, { month, year, driversUpdated: count }),
    );
});

/** GET /api/agencies/scores/export?month=&year= */
export const exportScoresExcel = catchAsync(async (req: Request, res: Response) => {
    const agencyId = getAgencyId(req);
    const q = req.query as any;
    const month = parseInt(q.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(q.year, 10) || new Date().getFullYear();
    const buffer = await scoreService.exportScoresExcel(agencyId, month, year);
    const filename = `diem-an-toan-thang-${month}-${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
});
