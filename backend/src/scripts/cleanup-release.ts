import 'dotenv/config';
import { In } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';

function parseKeepRoles(): string[] {
    const raw = process.env.CLEANUP_KEEP_ROLES as string;
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

async function runCleanupRelease(): Promise<void> {
    const keepRoles = parseKeepRoles();

    try {
        await AppDataSource.initialize();
        const roleRepo = AppDataSource.getRepository(Role);
        const userRepo = AppDataSource.getRepository(User);

        const rolesToKeep = await roleRepo.find({
            where: { name: In(keepRoles) },
        });

        if (rolesToKeep.length === 0) {
            throw new Error(
                `No roles found for CLEANUP_KEEP_ROLES="${keepRoles.join(',')}"`,
            );
        }

        const keepRoleIds = rolesToKeep.map((role) => role.id);
        const usersToKeep = await userRepo.find({
            where: { role_id: In(keepRoleIds) },
            withDeleted: true,
        });
        const keepUserIds = usersToKeep.map((user) => user.id);
        const keepAgencyIds = Array.from(
            new Set(
                usersToKeep
                    .map((user) => user.agency_id)
                    .filter((agencyId): agencyId is string => Boolean(agencyId)),
            ),
        );

        if (keepUserIds.length === 0) {
            throw new Error(
                'Cleanup stopped because no protected users were found. Seed/create manager accounts first.',
            );
        }

        await AppDataSource.transaction(async (manager) => {
            // Xoa du lieu nghiep vu
            await manager.query('DELETE FROM notification_reads');
            await manager.query('DELETE FROM notifications');
            await manager.query('DELETE FROM ai_violations');
            await manager.query('DELETE FROM gps_logs');
            await manager.query('DELETE FROM trip_checkins');
            await manager.query('DELETE FROM trip_status_histories');
            await manager.query('DELETE FROM trips');
            await manager.query('DELETE FROM driver_vehicle_assignments');
            await manager.query('DELETE FROM driver_images');
            await manager.query('DELETE FROM driver_scores');
            await manager.query('DELETE FROM driver_profiles');
            await manager.query('DELETE FROM devices');
            await manager.query('DELETE FROM vehicles');
            await manager.query('DELETE FROM routes');
            await manager.query('DELETE FROM violation_configs');

            // Xoa toan bo session/token/log de release sach du lieu test
            await manager.query('DELETE FROM password_reset_tokens');
            await manager.query('DELETE FROM user_sessions');
            await manager.query('DELETE FROM audit_logs');

            // Xoa user khong thuoc nhom quan ly cap cao
            await manager.query('DELETE FROM users WHERE id <> ALL($1::uuid[])', [
                keepUserIds,
            ]);

            // Xoa agency khong lien quan user duoc giu
            if (keepAgencyIds.length > 0) {
                await manager.query(
                    'DELETE FROM agencies WHERE id <> ALL($1::uuid[])',
                    [keepAgencyIds],
                );
            } else {
                await manager.query('DELETE FROM agencies');
            }
        });

        console.log(
            `Cleanup completed. Kept ${keepUserIds.length} manager accounts with roles: ${keepRoles.join(', ')}`,
        );
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exitCode = 1;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

void runCleanupRelease();
