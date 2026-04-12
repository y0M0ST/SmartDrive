import { ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                return next(
                    new AppError('Du lieu dau vao khong hop le.', 400, formattedErrors),
                );
            }
            return next(new AppError('Loi kiem tra du lieu dau vao.', 400));
        }
    };
};
