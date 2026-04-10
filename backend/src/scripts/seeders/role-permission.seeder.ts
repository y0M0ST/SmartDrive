import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Permission } from '../../entities/permission.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { Role } from '../../entities/role.entity';

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    AGENCY_ADMIN: [
        'users.read',
        'users.create',
        'users.update',
        'users.delete',
        'users.block',
        'drivers.read',
        'drivers.create',
        'drivers.update',
        'drivers.delete',
        'vehicles.read',
        'vehicles.create',
        'vehicles.update',
        'vehicles.delete',
        'routes.read',
        'routes.create',
        'routes.update',
        'routes.delete',
        'trips.read',
        'trips.create',
        'trips.update',
        'trips.cancel',
        'trips.start',
        'trips.complete',
        'violations.read',
        'violations.acknowledge',
        'violations.config.update',
        'notifications.read',
        'notifications.mark_read',
        'audit.read',
        'reports.read',
    ],
    DISPATCHER: [
        'drivers.read',
        'vehicles.read',
        'routes.read',
        'trips.read',
        'trips.create',
        'trips.update',
        'trips.cancel',
        'trips.start',
        'trips.complete',
        'violations.read',
        'violations.acknowledge',
        'notifications.read',
        'notifications.mark_read',
        'reports.read',
    ],
    DRIVER: [
        'trips.read',
        'notifications.read',
        'notifications.mark_read',
    ],
    VIEWER: [
        'users.read',
        'drivers.read',
        'vehicles.read',
        'routes.read',
        'trips.read',
        'violations.read',
        'notifications.read',
        'reports.read',
        'audit.read',
    ],
};

export async function seedRolePermissions(): Promise<void> {
    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);
    const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

    const roles = await roleRepo.find();
    const permissions = await permissionRepo.find();
    const allPermissionCodes = permissions.map((permission) => permission.code);

    for (const role of roles) {
        const configuredCodes = ROLE_PERMISSION_MAP[role.name];
        if (!configuredCodes) {
            continue;
        }

        const effectiveCodes = configuredCodes.includes('*')
            ? allPermissionCodes
            : configuredCodes;

        if (effectiveCodes.length === 0) {
            continue;
        }

        const targetPermissions = await permissionRepo.find({
            where: { code: In(effectiveCodes) },
        });

        await rolePermissionRepo.delete({ role_id: role.id });

        const rolePermissions = targetPermissions.map((permission) =>
            rolePermissionRepo.create({
                role_id: role.id,
                permission_id: permission.id,
            }),
        );

        await rolePermissionRepo.save(rolePermissions);
    }
}
