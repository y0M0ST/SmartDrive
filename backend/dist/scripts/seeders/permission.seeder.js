"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPermissions = seedPermissions;
const data_source_1 = require("../../config/data-source");
const permission_entity_1 = require("../../entities/permission.entity");
const PERMISSION_DEFINITIONS = [
    { code: 'agencies.read', description: 'View agencies' },
    { code: 'agencies.create', description: 'Create agency' },
    { code: 'agencies.update', description: 'Update agency' },
    { code: 'agencies.delete', description: 'Delete agency' },
    { code: 'users.read', description: 'View users' },
    { code: 'users.create', description: 'Create user' },
    { code: 'users.update', description: 'Update user' },
    { code: 'users.delete', description: 'Delete user' },
    { code: 'users.block', description: 'Block/unblock user' },
    { code: 'drivers.read', description: 'View driver profiles' },
    { code: 'drivers.create', description: 'Create driver profile' },
    { code: 'drivers.update', description: 'Update driver profile' },
    { code: 'drivers.delete', description: 'Delete driver profile' },
    { code: 'vehicles.read', description: 'View vehicles' },
    { code: 'vehicles.create', description: 'Create vehicle' },
    { code: 'vehicles.update', description: 'Update vehicle' },
    { code: 'vehicles.delete', description: 'Delete vehicle' },
    { code: 'routes.read', description: 'View routes' },
    { code: 'routes.create', description: 'Create route' },
    { code: 'routes.update', description: 'Update route' },
    { code: 'routes.delete', description: 'Delete route' },
    { code: 'trips.read', description: 'View trips' },
    { code: 'trips.create', description: 'Create trip' },
    { code: 'trips.update', description: 'Update trip' },
    { code: 'trips.cancel', description: 'Cancel trip' },
    { code: 'trips.start', description: 'Start trip' },
    { code: 'trips.complete', description: 'Complete trip' },
    { code: 'violations.read', description: 'View AI violations' },
    { code: 'violations.acknowledge', description: 'Acknowledge violation' },
    { code: 'violations.config.update', description: 'Update violation config' },
    { code: 'notifications.read', description: 'View notifications' },
    { code: 'notifications.mark_read', description: 'Mark notification as read' },
    { code: 'audit.read', description: 'View audit logs' },
    { code: 'reports.read', description: 'View reports and dashboard' },
];
async function seedPermissions() {
    const permissionRepo = data_source_1.AppDataSource.getRepository(permission_entity_1.Permission);
    for (const permissionDef of PERMISSION_DEFINITIONS) {
        const existing = await permissionRepo.findOne({
            where: { code: permissionDef.code },
        });
        if (existing) {
            existing.description = permissionDef.description;
            await permissionRepo.save(existing);
            continue;
        }
        const permission = permissionRepo.create(permissionDef);
        await permissionRepo.save(permission);
    }
}
//# sourceMappingURL=permission.seeder.js.map