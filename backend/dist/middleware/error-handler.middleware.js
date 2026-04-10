"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.notFoundHandler = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const multer_1 = __importDefault(require("multer"));
const typeorm_1 = require("typeorm");
const zod_1 = require("zod");
const app_error_1 = require("../common/errors/app-error");
const isProd = process.env.NODE_ENV === 'production';
function parseQueryFailedError(err) {
    const driverError = err.driverError;
    const code = driverError?.code;
    if (code === '23505') {
        return new app_error_1.AppError('Du lieu bi trung (unique constraint).', 409, {
            constraint: driverError?.constraint,
            detail: driverError?.detail,
        });
    }
    if (code === '23503') {
        return new app_error_1.AppError('Du lieu tham chieu khong hop le (foreign key).', 400, {
            constraint: driverError?.constraint,
            detail: driverError?.detail,
        });
    }
    return new app_error_1.AppError('Loi truy van database.', 500);
}
function normalizeError(err) {
    if (err instanceof app_error_1.AppError)
        return err;
    if (err instanceof zod_1.ZodError) {
        return new app_error_1.AppError('Du lieu dau vao khong hop le.', 400, err.issues);
    }
    if (err instanceof jsonwebtoken_1.TokenExpiredError) {
        return new app_error_1.AppError('Token da het han.', 401);
    }
    if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
        return new app_error_1.AppError('Token khong hop le.', 401);
    }
    if (err instanceof typeorm_1.QueryFailedError) {
        return parseQueryFailedError(err);
    }
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return new app_error_1.AppError('Kich thuoc anh toi da la 5MB.', 400);
        }
        return new app_error_1.AppError(err.message || 'Loi upload file.', 400);
    }
    if (err instanceof Error) {
        return new app_error_1.AppError(err.message || 'Internal server error', 500);
    }
    return new app_error_1.AppError('Internal server error', 500);
}
const notFoundHandler = (_req, _res, next) => {
    next(new app_error_1.AppError('Endpoint khong ton tai.', 404));
};
exports.notFoundHandler = notFoundHandler;
const globalErrorHandler = (err, _req, res, _next) => {
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
exports.globalErrorHandler = globalErrorHandler;
//# sourceMappingURL=error-handler.middleware.js.map