import pool from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Bat dau seed du lieu...');

    const adminHash = await bcrypt.hash('Admin@123', 12);
    const adminRes = await client.query(`
      INSERT INTO admins (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'super_admin')
      ON CONFLICT (email) DO NOTHING
      RETURNING id`,
      ['admin@smartdrive.vn', adminHash, 'Super Admin']
    );
    const adminId = adminRes.rows[0]?.id;
    console.log('Super Admin: admin@smartdrive.vn / Admin@123');

    const dispHash = await bcrypt.hash('Disp@123', 12);
    await client.query(`
      INSERT INTO admins (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'dispatcher')
      ON CONFLICT (email) DO NOTHING`,
      ['dispatcher@smartdrive.vn', dispHash, 'Nguyen Dieu Phoi']
    );
    console.log('Dispatcher: dispatcher@smartdrive.vn / Disp@123');

    const driversData = [
      { name: 'Nguyen Van An',  phone: '0901111001', license: 'DL001', type: 'D' },
      { name: 'Tran Van Binh',  phone: '0901111002', license: 'DL002', type: 'D' },
      { name: 'Le Van Cuong',   phone: '0901111003', license: 'DL003', type: 'E' },
      { name: 'Pham Van Dung',  phone: '0901111004', license: 'DL004', type: 'D' },
      { name: 'Hoang Van Em',   phone: '0901111005', license: 'DL005', type: 'E' },
    ];

    for (const d of driversData) {
      await client.query(`
        INSERT INTO drivers (created_by_admin_id, full_name, phone, license_number, license_expiry_date, license_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (phone) DO NOTHING`,
        [adminId, d.name, d.phone, d.license, '2027-12-31', d.type]
      );
    }
    console.log('5 tai xe da duoc tao');

    const vehiclesData = [
      { plate: '43B-001.01', brand: 'Thaco',   model: 'Universe', seats: 45, type: 'ghe_ngoi'    },
      { plate: '43B-001.02', brand: 'Hyundai', model: 'Solati',   seats: 16, type: 'limousine'   },
      { plate: '43B-001.03', brand: 'Thaco',   model: 'Meadow',   seats: 29, type: 'giuong_nam'  },
      { plate: '43B-001.04', brand: 'Samco',   model: 'Felix',    seats: 45, type: 'ghe_ngoi'    },
      { plate: '43B-001.05', brand: 'Hyundai', model: 'County',   seats: 29, type: 'giuong_nam'  },
    ];

    for (const v of vehiclesData) {
      await client.query(`
        INSERT INTO vehicles (license_plate, brand, model, seat_count, vehicle_type, registration_expiry_date, insurance_expiry_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (license_plate) DO NOTHING`,
        [v.plate, v.brand, v.model, v.seats, v.type, '2026-12-31', '2026-06-30']
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
    console.log('Dispatcher   : dispatcher@smartdrive.vn / Disp@123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed that bai, da rollback:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();