import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: false,
});

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 6543,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log('[DB] Ket noi PostgreSQL thanh cong'))
  .catch((err) => console.error('[DB] Ket noi PostgreSQL that bai:', err));

export default pool;