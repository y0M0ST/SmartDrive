import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import multer from 'multer';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/app-error';

const isProd = process.env.NODE_ENV === 'production';

function parseQueryFailedError(err: QueryFailedError): AppError {
    const driverError = (err as any).driverError;
    const code = driverError?.code;

    if (code === '23505') {
        return new AppError('Du lieu bi trung (unique constraint).', 409, {
            constraint: driverError?.constraint,
            detail: driverError?.detail,
        });
    }

    if (code === '23503') {
        return new AppError('Du lieu tham chieu khong hop le (foreign key).', 400, {
            constraint: driverError?.constraint,
            detail: driverError?.detail,
        });
    }

    return new AppError('Loi truy van database.', 500);
}

function normalizeError(err: unknown): AppError {
    if (err instanceof AppError) return err;

    if (err instanceof ZodError) {
        return new AppError('Du lieu dau vao khong hop le.', 400, err.issues);
    }

    if (err instanceof TokenExpiredError) {
        return new AppError('Token da het han.', 401);
    }

    if (err instanceof JsonWebTokenError) {
        return new AppError('Token khong hop le.', 401);
    }

    if (err instanceof QueryFailedError) {
        return parseQueryFailedError(err);
    }

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return new AppError('Kich thuoc anh toi da la 5MB.', 400);
        }
        return new AppError(err.message || 'Loi upload file.', 400);
    }

    if (err instanceof Error) {
        return new AppError(err.message || 'Internal server error', 500);
    }

    return new AppError('Internal server error', 500);
}

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Endpoint khong ton tai.', 404));
};

export const globalErrorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    const appError = normalizeError(err);

    if (!isProd) {
        console.error('[GlobalErrorHandler]', err);
    }

    return res.status(appError.statusCode).json({
        status: 'error',
        message: appError.message,
        details: appError.details ?? null,
        ...(isProd ? {} : { stack: err instanceof Error ? err.stack : null }),
    });
};
