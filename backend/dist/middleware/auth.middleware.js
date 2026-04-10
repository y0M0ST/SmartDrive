"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const user_session_entity_1 = require("../entities/user-session.entity");
const app_error_1 = require("../common/errors/app-error");
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new app_error_1.AppError('Vui long cung cap token.', 401));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const sessionId = decoded.sid;
        if (!sessionId) {
            return next(new app_error_1.AppError('Phien dang nhap khong hop le.', 401));
        }
        const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
        const activeSession = await sessionRepository.findOne({
            where: {
                id: sessionId,
                user_id: decoded.id,
                revoked_at: (0, typeorm_1.IsNull)(),
                expires_at: (0, typeorm_1.MoreThan)(new Date()),
            },
        });
        if (!activeSession) {
            return next(new app_error_1.AppError('Phien dang nhap da het han hoac da dang xuat.', 401));
        }
        req.user = decoded;
        return next();
    }
    catch (error) {
        return next(new app_error_1.AppError('Token khong hop le hoac da het han.', 401));
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return next(new app_error_1.AppError('Ban khong co quyen thuc hien thao tac nay.', 403));
        }
        return next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.middleware.js.map