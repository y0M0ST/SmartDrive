import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error';

/**
 * US_20 — Xác thực thiết bị / Python AI pipeline.
 * Header: `x-device-api-key` khớp `MASTER_DEVICE_API_KEY` trong `.env`.
 */
export const deviceAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.MASTER_DEVICE_API_KEY;
    if (!expected || expected.trim() === '') {
        return next(
            new AppError('Server chưa cấu hình MASTER_DEVICE_API_KEY. Vui lòng thêm vào file .env.', 500),
        );
    }

    const raw = req.headers['x-device-api-key'];
    const provided = Array.isArray(raw) ? raw[0] : raw;

    if (typeof provided !== 'string' || provided !== expected) {
        return next(new AppError('Khóa thiết bị không hợp lệ hoặc thiếu header x-device-api-key.', 401));
    }

    return next();
};
