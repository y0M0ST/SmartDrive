import bcrypt from 'bcryptjs';
import pool from '../config/database';

async function runSeeder() {
  console.log('Bắt đầu seed dữ liệu...');

  try {
    // ============================================================
    // 1. ROLES
    // ============================================================
    await pool.query(`
      INSERT INTO roles (name) VALUES
        ('super_admin'),
        ('agency_manager'),
        ('driver')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('Roles đã được tạo');

    // ============================================================
    // 2. PERMISSIONS
    // ============================================================
    await pool.query(`
      INSERT INTO permissions (name, description) VALUES
        ('manage_agencies',     'Quản lý đại lý'),
        ('manage_users',        'Quản lý tài khoản'),
        ('manage_drivers',      'Quản lý tài xế'),
        ('manage_vehicles',     'Quản lý xe khách'),
        ('manage_routes',       'Quản lý tuyến đường'),
        ('manage_trips',        'Quản lý chuyến đi'),
        ('view_violations',     'Xem vi phạm'),
        ('view_reports',        'Xem báo cáo'),
        ('view_own_trips',      'Xem chuyến đi của mình'),
        ('view_own_violations', 'Xem vi phạm của mình'),
        ('change_password',     'Đổi mật khẩu')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('Permissions đã được tạo');

    // ============================================================
    // 3. ROLE_PERMISSIONS
    // ============================================================
    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'super_admin'
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'agency_manager'
        AND p.name IN ('manage_drivers','manage_vehicles','manage_routes','manage_trips','view_violations','view_reports','change_password')
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'driver'
        AND p.name IN ('view_own_trips','view_own_violations','change_password')
      ON CONFLICT DO NOTHING
    `);
    console.log('Role permissions đã được gán');

    // ============================================================
    // 4. USERS — không hardcode ID, DB tự sinh
    // ============================================================
    const superAdminHash  = await bcrypt.hash('Admin@123',    12);
    const danangHash      = await bcrypt.hash('Danang@123',   12);
    const trungtamHash    = await bcrypt.hash('Trungtam@123', 12);
    const driver1Hash     = await bcrypt.hash('Driver@123',   12);
    const driver2Hash     = await bcrypt.hash('Driver@123',   12);

    const superAdminResult = await pool.query(
      `INSERT INTO users (username, email, password, status)
       VALUES ('superadmin', 'admin@smartdrive.vn', $1, 'active')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      [superAdminHash]
    );
    const superAdminId = superAdminResult.rows[0].id;

    const danangResult = await pool.query(
      `INSERT INTO users (username, email, password, status)
       VALUES ('danang_manager', 'danang@smartdrive.vn', $1, 'active')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      [danangHash]
    );
    const danangManagerId = danangResult.rows[0].id;

    const trungtamResult = await pool.query(
      `INSERT INTO users (username, email, password, status)
       VALUES ('trungtam_manager', 'trungtam@smartdrive.vn', $1, 'active')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      [trungtamHash]
    );
    const trungtamManagerId = trungtamResult.rows[0].id;

    const driver1Result = await pool.query(
      `INSERT INTO users (username, email, password, status)
       VALUES ('driver_an', 'nguyenvanan@smartdrive.vn', $1, 'active')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      [driver1Hash]
    );
    const driver1Id = driver1Result.rows[0].id;

    const driver2Result = await pool.query(
      `INSERT INTO users (username, email, password, status)
       VALUES ('driver_binh', 'tranvanbinh@smartdrive.vn', $1, 'active')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      [driver2Hash]
    );
    const driver2Id = driver2Result.rows[0].id;

    console.log('Users đã được tạo');

    // ============================================================
    // 5. USER_ROLES
    // ============================================================
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'super_admin'
       ON CONFLICT DO NOTHING`,
      [superAdminId]
    );
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'agency_manager'
       ON CONFLICT DO NOTHING`,
      [danangManagerId]
    );
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'agency_manager'
       ON CONFLICT DO NOTHING`,
      [trungtamManagerId]
    );
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'driver'
       ON CONFLICT DO NOTHING`,
      [driver1Id]
    );
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'driver'
       ON CONFLICT DO NOTHING`,
      [driver2Id]
    );
    console.log('User roles đã được gán');

    // ============================================================
    // 6. AGENCIES
    // ============================================================
    const agency1Result = await pool.query(
      `INSERT INTO agencies (user_id, name, address, phone)
       VALUES ($1, 'Nhà xe Đà Nẵng', '123 Nguyễn Văn Linh, Đà Nẵng', '0905111001')
       ON CONFLICT (name) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id`,
      [danangManagerId]
    );
    const agency1Id = agency1Result.rows[0].id;

    const agency2Result = await pool.query(
      `INSERT INTO agencies (user_id, name, address, phone)
       VALUES ($1, 'Bến xe Trung Tâm', '456 Điện Biên Phủ, Đà Nẵng', '0905111002')
       ON CONFLICT (name) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id`,
      [trungtamManagerId]
    );
    const agency2Id = agency2Result.rows[0].id;

    console.log('Agencies đã được tạo');

    // ============================================================
    // 7. VEHICLES
    // ============================================================
    await pool.query(
      `INSERT INTO vehicles (agency_id, plate_number, model, type, capacity, status)
       VALUES ($1, '43B-123.45', 'Universe', 'ghe_ngoi', 45, 'available')
       ON CONFLICT (plate_number) DO NOTHING`,
      [agency1Id]
    );
    await pool.query(
      `INSERT INTO vehicles (agency_id, plate_number, model, type, capacity, status)
       VALUES ($1, '43B-678.90', 'Limousine', 'limousine', 34, 'available')
       ON CONFLICT (plate_number) DO NOTHING`,
      [agency1Id]
    );
    await pool.query(
      `INSERT INTO vehicles (agency_id, plate_number, model, type, capacity, status)
       VALUES ($1, '43C-111.22', 'Universe', 'ghe_ngoi', 45, 'available')
       ON CONFLICT (plate_number) DO NOTHING`,
      [agency2Id]
    );
    console.log('Vehicles đã được tạo');

    // ============================================================
    // 7.1 DEVICES (camera cho xe)
    // ============================================================
    await pool.query(
    `INSERT INTO devices (vehicle_id, device_code)
    SELECT id, 'CAM_001' FROM vehicles WHERE plate_number = '43B-123.45'
    ON CONFLICT (device_code) DO NOTHING`
    );
    await pool.query(
    `INSERT INTO devices (vehicle_id, device_code)
    SELECT id, 'CAM_002' FROM vehicles WHERE plate_number = '43B-678.90'
    ON CONFLICT (device_code) DO NOTHING`
    );
    await pool.query(
    `INSERT INTO devices (vehicle_id, device_code)
    SELECT id, 'CAM_003' FROM vehicles WHERE plate_number = '43C-111.22'
    ON CONFLICT (device_code) DO NOTHING`
    );
    console.log('Devices (cameras) đã được tạo');

    // ============================================================
    // 8. DRIVERS
    // ============================================================
    await pool.query(
      `INSERT INTO drivers (user_id, agency_id, full_name, phone, identity_card, license_number, license_type, license_expiry, status)
       VALUES ($1, $2, 'Nguyễn Văn An', '0901111001', '048111111111', 'DL001', 'D', '2028-12-31', 'active')
       ON CONFLICT (phone) DO NOTHING`,
      [driver1Id, agency1Id]
    );
    await pool.query(
      `INSERT INTO drivers (user_id, agency_id, full_name, phone, identity_card, license_number, license_type, license_expiry, status)
       VALUES ($1, $2, 'Trần Văn Bình', '0901111002', '048222222222', 'DL002', 'D', '2028-12-31', 'active')
       ON CONFLICT (phone) DO NOTHING`,
      [driver2Id, agency1Id]
    );
    console.log('Drivers đã được tạo');

    // ============================================================
    // 9. ROUTES
    // ============================================================
    await pool.query(`
      INSERT INTO routes (name, start_point, end_point, distance, estimated_duration)
      VALUES
        ('Đà Nẵng - Hà Nội', 'Đà Nẵng - Quảng Nam', 'Hà Nội', 780, 840),
        ('Đà Nẵng - TP.HCM', 'Đà Nẵng - Quảng Nam', 'Hồ Chí Minh', 960, 1020)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('Routes đã được tạo');

    // ============================================================
    // 10. TRIPS (dữ liệu test)
    // ============================================================
    await pool.query(`
        INSERT INTO trips (driver_id, vehicle_id, route_id, status, scheduled_start)
        SELECT
            d.id,
            v.id,
            r.id,
            'scheduled',
            NOW() + INTERVAL '2 hours'
        FROM drivers d, vehicles v, routes r
        WHERE d.phone = '0901111001'
            AND v.plate_number = '43B-123.45'
            AND r.name = 'Đà Nẵng - Hà Nội'
        LIMIT 1
        ON CONFLICT DO NOTHING
        `);
        console.log('Trips (test data) đã được tạo');
    
    // ============================================================
    // 10. VIOLATION_TYPES + CONFIGS
    // ============================================================
    await pool.query(`
      INSERT INTO violation_types (name, description) VALUES
        ('Ngủ gật',               'Tài xế có dấu hiệu buồn ngủ hoặc ngủ gật'),
        ('Mất tập trung',         'Tài xế không tập trung vào đường'),
        ('Sử dụng điện thoại',    'Tài xế dùng điện thoại khi lái xe'),
        ('Không đeo dây an toàn', 'Tài xế không đeo dây an toàn')
      ON CONFLICT (name) DO NOTHING
    `);

    const violationData = [
      { name: 'Ngủ gật',               points: 20, penalty: 500000 },
      { name: 'Mất tập trung',         points: 10, penalty: 200000 },
      { name: 'Sử dụng điện thoại',    points: 15, penalty: 300000 },
      { name: 'Không đeo dây an toàn', points: 5,  penalty: 100000 },
    ];

    for (const v of violationData) {
      await pool.query(`
        INSERT INTO violation_configs (violation_type_id, points_to_subtract, penalty_amount, effective_from)
        SELECT id, $1, $2, '2025-01-01' FROM violation_types WHERE name = $3
        ON CONFLICT DO NOTHING
      `, [v.points, v.penalty, v.name]);
    }
    console.log('Violation types và configs đã được tạo');

    console.log('\nSeed dữ liệu hoàn thành!');
    console.log('\nTest accounts:');
    console.log('  Super Admin:     admin@smartdrive.vn        / Admin@123');
    console.log('  Agency Manager:  danang@smartdrive.vn       / Danang@123');
    console.log('  Agency Manager:  trungtam@smartdrive.vn     / Trungtam@123');
    console.log('  Driver:          nguyenvanan@smartdrive.vn  / Driver@123');
    console.log('  Driver:          tranvanbinh@smartdrive.vn  / Driver@123');

  } catch (err) {
    console.error('Seed thất bại:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

runSeeder();