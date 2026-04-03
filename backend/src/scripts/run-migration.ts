import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function runMigration() {
  const finalSchemaFile = 'final_schema.sql';
  const sqlPath = path.join(__dirname, finalSchemaFile);
  const shouldReset = process.argv.includes('--reset') || process.env.RESET_DB === 'true';

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Khong tim thay file schema tong hop: ${finalSchemaFile}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    if (shouldReset) {
      console.log('Dang reset lai schema public...');
      await pool.query(`
        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO CURRENT_USER;
        GRANT ALL ON SCHEMA public TO public;
      `);
    }

    console.log(`Dang ap dung ${finalSchemaFile}...`);
    await pool.query(sql);
    console.log(`Migration hoan thanh — da ap dung schema tong hop ${finalSchemaFile}`);
  } catch (err) {
    console.error('Migration that bai:', err);
  } finally {
    await pool.end();
  }
}

runMigration();