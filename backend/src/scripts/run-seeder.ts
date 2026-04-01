import pool from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Bat dau seed du lieu...');

    const daNangAgencyRes = await client.query(
      `INSERT INTO agencies (code, name, address, contact_phone, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (code)
       DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, contact_phone = EXCLUDED.contact_phone
       RETURNING id, name`,
      ['NHA_XE_DA_NANG', 'Nha xe Da Nang', 'Da Nang', '0905111111']
    );

    const centralAgencyRes = await client.query(
      `INSERT INTO agencies (code, name, address, contact_phone, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (code)
       DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, contact_phone = EXCLUDED.contact_phone
       RETURNING id, name`,
      ['BEN_XE_TRUNG_TAM', 'Ben xe Trung Tam', 'Da Nang', '0905222222']
    );

    const daNangAgencyId = daNangAgencyRes.rows[0].id;
    const centralAgencyId = centralAgencyRes.rows[0].id;
    console.log('2 dai ly mau da duoc tao/cap nhat');

    const adminHash = await bcrypt.hash('Admin@123', 12);
    const adminRes = await client.query(`
      INSERT INTO admins (email, password_hash, full_name, role, agency_id, created_by_admin_id)
      VALUES ($1, $2, $3, 'super_admin', NULL, NULL)
      ON CONFLICT (email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role, agency_id = NULL, created_by_admin_id = NULL
      RETURNING id`,
      ['admin@smartdrive.vn', adminHash, 'Super Admin']
    );
    const adminId = adminRes.rows[0]?.id;
    console.log('Super Admin: admin@smartdrive.vn / Admin@123');

    const daNangManagerHash = await bcrypt.hash('Danang@123', 12);
    await client.query(`
      INSERT INTO admins (email, password_hash, full_name, role, agency_id, created_by_admin_id)
      VALUES ($1, $2, $3, 'agency_manager', $4, $5)
      ON CONFLICT (email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role, agency_id = EXCLUDED.agency_id, created_by_admin_id = EXCLUDED.created_by_admin_id`,
      ['danang@smartdrive.vn', daNangManagerHash, 'Quan Ly Nha Xe Da Nang', daNangAgencyId, adminId]
    );

    const centralManagerHash = await bcrypt.hash('Trungtam@123', 12);
    await client.query(`
      INSERT INTO admins (email, password_hash, full_name, role, agency_id, created_by_admin_id)
      VALUES ($1, $2, $3, 'agency_manager', $4, $5)
      ON CONFLICT (email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role, agency_id = EXCLUDED.agency_id, created_by_admin_id = EXCLUDED.created_by_admin_id`,
      ['trungtam@smartdrive.vn', centralManagerHash, 'Quan Ly Ben Xe Trung Tam', centralAgencyId, adminId]
    );
    console.log('Agency manager: danang@smartdrive.vn / Danang@123');
    console.log('Agency manager: trungtam@smartdrive.vn / Trungtam@123');

    const driversData = [
      { name: 'Nguyen Van An',  phone: '0901111001', license: 'DL001', type: 'D', agencyId: daNangAgencyId },
      { name: 'Tran Van Binh',  phone: '0901111002', license: 'DL002', type: 'D', agencyId: daNangAgencyId },
      { name: 'Le Van Cuong',   phone: '0901111003', license: 'DL003', type: 'E', agencyId: centralAgencyId },
      { name: 'Pham Van Dung',  phone: '0901111004', license: 'DL004', type: 'D', agencyId: centralAgencyId },
      { name: 'Hoang Van Em',   phone: '0901111005', license: 'DL005', type: 'E', agencyId: daNangAgencyId },
    ];

    for (const d of driversData) {
      await client.query(`
        INSERT INTO drivers (created_by_admin_id, agency_id, full_name, phone, license_number, license_expiry_date, license_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (phone)
        DO UPDATE SET full_name = EXCLUDED.full_name, license_number = EXCLUDED.license_number, license_expiry_date = EXCLUDED.license_expiry_date, license_type = EXCLUDED.license_type, agency_id = EXCLUDED.agency_id`,
        [adminId, d.agencyId, d.name, d.phone, d.license, '2027-12-31', d.type]
      );
    }
    console.log('5 tai xe da duoc tao');

    const vehiclesData = [
      { plate: '43B-001.01', brand: 'Thaco',   model: 'Universe', seats: 45, type: 'ghe_ngoi',   agencyId: daNangAgencyId },
      { plate: '43B-001.02', brand: 'Hyundai', model: 'Solati',   seats: 16, type: 'limousine',  agencyId: daNangAgencyId },
      { plate: '43B-001.03', brand: 'Thaco',   model: 'Meadow',   seats: 29, type: 'giuong_nam', agencyId: centralAgencyId },
      { plate: '43B-001.04', brand: 'Samco',   model: 'Felix',    seats: 45, type: 'ghe_ngoi',   agencyId: centralAgencyId },
      { plate: '43B-001.05', brand: 'Hyundai', model: 'County',   seats: 29, type: 'giuong_nam', agencyId: daNangAgencyId },
    ];

    for (const v of vehiclesData) {
      await client.query(`
        INSERT INTO vehicles (agency_id, license_plate, brand, model, seat_count, vehicle_type, registration_expiry_date, insurance_expiry_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (license_plate)
        DO UPDATE SET brand = EXCLUDED.brand, model = EXCLUDED.model, seat_count = EXCLUDED.seat_count, vehicle_type = EXCLUDED.vehicle_type, registration_expiry_date = EXCLUDED.registration_expiry_date, insurance_expiry_date = EXCLUDED.insurance_expiry_date, agency_id = EXCLUDED.agency_id`,
        [v.agencyId, v.plate, v.brand, v.model, v.seats, v.type, '2026-12-31', '2026-06-30']
      );
    }
    console.log('5 xe khach da duoc tao');

    await client.query(`
      INSERT INTO routes (name, origin, destination, distance_km, estimated_duration_min)
      VALUES
        (N'Da Nang - Ha Noi', N'Da Nang', N'Ha Noi', 780, 840),
        (N'Da Nang - TP.HCM', N'Da Nang', N'TP.HCM', 960, 1020)
      ON CONFLICT DO NOTHING`
    );
    console.log('2 tuyen duong mau da duoc tao');

    await client.query('COMMIT');
    console.log('');
    console.log('Seed hoan thanh!');
    console.log('Super Admin  : admin@smartdrive.vn / Admin@123');
    console.log('Agency DN    : danang@smartdrive.vn / Danang@123');
    console.log('Agency BXTT  : trungtam@smartdrive.vn / Trungtam@123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed that bai, da rollback:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();