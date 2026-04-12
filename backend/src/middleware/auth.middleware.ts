import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IsNull, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { UserSession } from '../entities/user-session.entity';
import { AppError } from '../common/errors/app-error';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Vui long cung cap token.', 401));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const sessionId = decoded.sid as string | undefined;

        if (!sessionId) {
            return next(new AppError('Phien dang nhap khong hop le.', 401));
        }

        const sessionRepository = AppDataSource.getRepository(UserSession);
        const activeSession = await sessionRepository.findOne({
            where: {
                id: sessionId,
                user_id: decoded.id,
                revoked_at: IsNull(),
                expires_at: MoreThan(new Date()),
            },
        });

        if (!activeSession) {
            return next(
                new AppError('Phien dang nhap da het han hoac da dang xuat.', 401),
            );
        }

        (req as any).user = decoded;
        return next();
    } catch (error) {
        return next(new AppError('Token khong hop le hoac da het han.', 401));
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return next(new AppError('Ban khong co quyen thuc hien thao tac nay.', 403));
        }
        return next();
    };
};
