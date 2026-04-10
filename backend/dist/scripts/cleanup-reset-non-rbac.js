"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const data_source_1 = require("../config/data-source");
const TABLES_TO_TRUNCATE = [
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
    'audit_logs',
    'users',
    'agencies',
];
async function runCleanupResetNonRbac() {
    try {
        await data_source_1.AppDataSource.initialize();
        await data_source_1.AppDataSource.transaction(async (manager) => {
            await manager.query(`TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE`);
        });
        console.log('Cleanup completed. Non-RBAC data has been fully reset (including admin/users).');
        console.log('RBAC tables kept: roles, permissions, role_permissions.');
    }
    catch (error) {
        console.error('Cleanup reset non-RBAC failed:', error);
        process.exitCode = 1;
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
        }
    }
}
void runCleanupResetNonRbac();
//# sourceMappingURL=cleanup-reset-non-rbac.js.map