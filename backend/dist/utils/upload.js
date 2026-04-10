"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadConfig = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const app_error_1 = require("../common/errors/app-error");
// Cấu hình lưu tạm vào RAM (MemoryStorage) để xíu nữa quăng lên Cloudinary/S3
const storage = multer_1.default.memoryStorage();
exports.uploadConfig = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB chuẩn theo US
    },
    fileFilter: (req, file, cb) => {
        // Chỉ cho phép jpg, jpeg, png
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        else {
            cb(new app_error_1.AppError('Chi chap nhan dinh dang anh .jpg hoac .png!', 400));
        }
    },
});
//# sourceMappingURL=upload.js.map