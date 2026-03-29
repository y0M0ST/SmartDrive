import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function runMigration() {
  const sqlPath = path.join(__dirname, '001_init_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Dang chay migration...');
    await pool.query(sql);
    console.log('Migration hoan thanh — 13 bang da duoc tao');
  } catch (err) {
    console.error('Migration that bai:', err);
  } finally {
    await pool.end();
  }
}

runMigration();