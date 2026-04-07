import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: false,
});
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'smartdrive_dev',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'smartdrive123',
  max:      20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 60000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Ket noi PostgreSQL that bai:', err.message);
    return;
  }
  console.log('[DB] Ket noi PostgreSQL thanh cong');
  release();
});

export default pool;