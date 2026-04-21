import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ServiceResponse } from '../../models/serviceResponse';
import type { JwtPayload } from '../../utils/jwtHelper';
import { AppError } from '../../common/errors/app-error';
import * as reportsService from './reports.service';
import { agencyReportQuerySchema } from './reports.dto';

const agencyIdFromUser = (req: Request): string => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user?.agency_id) {
        throw new AppError('Token không hợp lệ.', 401);
    }
    return user.agency_id as string;
};

export const getDashboard = catchAsync(async (req: Request, res: Response) => {
    const agencyId = agencyIdFromUser(req);
    const parsed = agencyReportQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    const data = await reportsService.getAgencyDashboard(agencyId, parsed.query);
    res.status(200).json(ServiceResponse.success('Thống kê dashboard nhà xe.', data));
});

export const exportExcel = catchAsync(async (req: Request, res: Response) => {
    const agencyId = agencyIdFromUser(req);
    const parsed = agencyReportQuerySchema.parse({
        query: req.query,
        body: req.body,
        params: req.params,
    });
    const out = await reportsService.buildAgencyReportExcelBuffer(agencyId, parsed.query);
    if (!out) {
        return res.status(404).json(
            ServiceResponse.error('Không có dữ liệu chuyến hoàn thành hoặc vi phạm trong khoảng thời gian đã chọn.'),
        );
    }
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.buffer);
});
