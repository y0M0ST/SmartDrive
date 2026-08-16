import 'dotenv/config';
import { AppDataSource } from '../config/data-source';

/**
 * Truncate toàn bộ bảng nghiệp vụ + RBAC (roles, permissions, role_permissions).
 * PostgreSQL tự sắp thứ tự theo FK khi liệt kê đủ bảng trong một lệnh TRUNCATE … CASCADE.
 *
 * An toàn: chỉ chạy khi đặt SMARTDRIVE_FULL_RESET=yes (tránh xóa nhầm production).
 * Sau khi chạy: cần `npm run seed` để có lại role/permission/user mẫu.
 */
const TABLES_FULL_RESET = [
    'notification_reads',
    'notifications',
    'ai_violations',
    'gps_logs',
    'trip_checkins',
    'trip_status_histories',
    'trips',
    'driver_vehicle_assignments',
    'driver_images',
    'driver_scores',
    'driver_profiles',
    'devices',
    'vehicles',
    'routes',
    'violation_configs',
    'password_reset_tokens',
    'user_sessions',
    'profile_contact_change_otps',
    'audit_logs',
    'salary_configs',
    'users',
    'role_permissions',
    'agencies',
    'roles',
    'permissions',
];

async function runCleanupResetFull(): Promise<void> {
    const confirm = (process.env.SMARTDRIVE_FULL_RESET || '').trim().toLowerCase();
    if (confirm !== 'yes' && confirm !== '1' && confirm !== 'true') {
        console.error(
            '[cleanup-reset-full] Từ chối: đặt SMARTDRIVE_FULL_RESET=yes (hoặc 1/true) để xác nhận xóa toàn bộ DB nghiệp vụ + RBAC.',
        );
        process.exitCode = 1;
        return;
    }

    try {
        await AppDataSource.initialize();

        await AppDataSource.transaction(async (manager) => {
            await manager.query(
                `TRUNCATE TABLE ${TABLES_FULL_RESET.join(', ')} RESTART IDENTITY CASCADE`,
            );
        });

        console.log(
            '[cleanup-reset-full] Hoàn tất: đã TRUNCATE toàn bộ bảng (gồm roles, permissions, role_permissions).',
        );
        console.log('[cleanup-reset-full] Chạy `npm run seed` để nạp lại dữ liệu khởi tạo.');
    } catch (error) {
        console.error('[cleanup-reset-full] Lỗi:', error);
        process.exitCode = 1;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

void runCleanupResetFull();
