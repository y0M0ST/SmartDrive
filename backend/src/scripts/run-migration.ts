import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function runMigration() {
  const shouldReset = process.argv.includes('--reset') || process.env.RESET_DB === 'true';
  const sqlPath = path.join(__dirname, 'final_schema.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Không tìm thấy file schema: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    if (shouldReset) {
      console.log('Đang reset lại schema public...');
      await pool.query(`
        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO CURRENT_USER;
        GRANT ALL ON SCHEMA public TO public;
      `);
      console.log('Reset hoàn thành');
    }

    console.log('Đang áp dụng schema...');
    await pool.query(sql);
    console.log('Migration hoàn thành — SmartDrive V4 schema đã được tạo');
  } catch (err) {
    console.error('Migration thất bại:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

runMigration();