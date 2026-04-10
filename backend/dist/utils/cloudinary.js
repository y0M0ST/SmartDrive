"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageBufferToCloudinary = uploadImageBufferToCloudinary;
const cloudinary_1 = require("cloudinary");
const app_error_1 = require("../common/errors/app-error");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
function ensureCloudinaryConfig() {
    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
        throw new app_error_1.AppError('Cloudinary config missing. Please set CLOUDINARY_* env vars.', 500, {
            cloudName: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
            apiKey: Boolean(process.env.CLOUDINARY_API_KEY),
            apiSecret: Boolean(process.env.CLOUDINARY_API_SECRET),
        });
    }
}
async function uploadImageBufferToCloudinary(buffer, folder) {
    ensureCloudinaryConfig();
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'image',
        }, (error, result) => {
            if (error || !result?.secure_url) {
                reject(new app_error_1.AppError('Upload image to cloud failed.', 500, {
                    provider: 'cloudinary',
                }));
                return;
            }
            resolve(result.secure_url);
        });
        stream.end(buffer);
    });
}
//# sourceMappingURL=cloudinary.js.map