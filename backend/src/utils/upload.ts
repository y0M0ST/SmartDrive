import multer from 'multer';
import path from 'path';
import { AppError } from '../common/errors/app-error';

// Cấu hình lưu tạm vào RAM (MemoryStorage) để xíu nữa quăng lên Cloudinary/S3
const storage = multer.memoryStorage();

export const uploadConfig = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB chuẩn theo US
    },
    fileFilter: (req, file, cb) => {
        // Chỉ cho phép jpg, jpeg, png
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new AppError('Chi chap nhan dinh dang anh .jpg hoac .png!', 400));
        }
    },
});