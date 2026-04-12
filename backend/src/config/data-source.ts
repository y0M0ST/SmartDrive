import 'dotenv/config'; // Dòng này siêu quan trọng: Nó hút data từ file .env lên hệ thống
import { DataSource } from 'typeorm';

// Lấy chuỗi kết nối từ file .env
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("Thiếu DATABASE_URL trong file .env rồi bồ ơi!");
    process.exit(1);
}

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: dbUrl, // Nhét cái biến env vào đây
    ssl: {
        rejectUnauthorized: false, // BẮT BUỘC phải có dòng này khi xài Neon DB
    },
    synchronize: false, // Sprint 1 cứ để TRUE cho nó tự tạo bảng. Xong đồ án đổi thành FALSE nha.
    logging: true, // Để true nếu bồ muốn xem nó chạy lệnh SQL gì ngầm bên dưới
    entities: ['src/entities/**/*.entity.ts'], // Đường dẫn trỏ tới 23 file Entity của bồ
    migrations: ['src/scripts/migrations/**/*.ts'],
    subscribers: [],
});