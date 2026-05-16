/** Dữ liệu file từ multer — tách khỏi `Express.Multer` để build production không cần global namespace. */
export type MulterFile = {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};
