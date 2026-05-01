import 'dotenv/config'; 
import { DataSource } from 'typeorm';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("Thiếu DATABASE_URL trong file .env rồi bồ ơi!");
    process.exit(1);
}

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: dbUrl, 
    ssl: {
        rejectUnauthorized: false, // BẮT BUỘC phải có dòng này khi xài Neon DB
    },
    synchronize: true, 
    logging: false, 
    entities: ['src/entities/**/*.entity.ts'], // Đường dẫn trỏ tới 23 file Entity 
    migrations: ['src/scripts/migrations/**/*.ts'],
    subscribers: [],
});