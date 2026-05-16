import 'dotenv/config';
import path from 'path';
import { DataSource } from 'typeorm';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Thiếu DATABASE_URL trong file .env rồi bồ ơi!');
    process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';

/** `ts-node` / dev: `src/config` → entities `.ts`. Build: `dist/config` → entities `.js`. */
const entityGlob = isProduction
    ? path.join(__dirname, '..', 'entities', '**', '*.entity.js')
    : path.join(__dirname, '..', 'entities', '**', '*.entity.ts');

const migrationGlob = isProduction
    ? path.join(__dirname, '..', 'scripts', 'migrations', '**', '*.js')
    : path.join(__dirname, '..', 'scripts', 'migrations', '**', '*.ts');

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: {
        rejectUnauthorized: false, // Bắt buộc khi dùng Neon / Postgres SSL trên cloud
    },
    synchronize: !isProduction,
    logging: false,
    entities: [entityGlob],
    migrations: [migrationGlob],
    subscribers: [],
});
