import pool from '../config/database';

async function runSoftDeleteMigration() {
  console.log('Đang thêm cột deleted_at cho soft delete...');

  try {
    // 1. Thêm deleted_at vào bảng routes
    await pool.query(`
      ALTER TABLE routes
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL
    `);
    console.log('Routes.deleted_at đã được thêm');

    // 2. Thêm deleted_at vào bảng vehicles
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL
    `);
    console.log('Vehicles.deleted_at đã được thêm');

    // 3. Thêm deleted_at vào bảng admins (cho agency_accounts soft delete)
    await pool.query(`
      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL
    `);
    console.log('Admins.deleted_at đã được thêm');

    console.log('\nMigration soft delete hoàn thành!');
  } catch (err) {
    console.error('Migration thất bại:', err);
  } finally {
    await pool.end();
  }
}

runSoftDeleteMigration();