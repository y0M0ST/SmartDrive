import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../common/errors/app-error';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureCloudinaryConfig(): void {
    if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
    ) {
        throw new AppError(
            'Cloudinary config missing. Please set CLOUDINARY_* env vars.',
            500,
            {
                cloudName: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
                apiKey: Boolean(process.env.CLOUDINARY_API_KEY),
                apiSecret: Boolean(process.env.CLOUDINARY_API_SECRET),
            },
        );
    }
}

export async function uploadImageBufferToCloudinary(
    buffer: Buffer,
    folder: string,
): Promise<string> {
    ensureCloudinaryConfig();

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
            },
            (error, result) => {
                if (error || !result?.secure_url) {
                    reject(
                        new AppError('Upload image to cloud failed.', 500, {
                            provider: 'cloudinary',
                        }),
                    );
                    return;
                }
                resolve(result.secure_url);
            },
        );

        stream.end(buffer);
    });
}
