"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const app_error_1 = require("../common/errors/app-error");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = error.issues.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                return next(new app_error_1.AppError('Du lieu dau vao khong hop le.', 400, formattedErrors));
            }
            return next(new app_error_1.AppError('Loi kiem tra du lieu dau vao.', 400));
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map