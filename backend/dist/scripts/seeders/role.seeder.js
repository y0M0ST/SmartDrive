"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = seedRoles;
const data_source_1 = require("../../config/data-source");
const role_entity_1 = require("../../entities/role.entity");
const ROLE_DEFINITIONS = [
    { name: 'SUPER_ADMIN', description: 'Global system administrator' },
    { name: 'AGENCY_ADMIN', description: 'Agency-level administrator' },
    { name: 'DISPATCHER', description: 'Operations dispatcher' },
    { name: 'DRIVER', description: 'Vehicle driver account' },
    { name: 'VIEWER', description: 'Read-only agency staff account' },
];
async function seedRoles() {
    const roleRepo = data_source_1.AppDataSource.getRepository(role_entity_1.Role);
    for (const roleDef of ROLE_DEFINITIONS) {
        const existing = await roleRepo.findOne({
            where: { name: roleDef.name },
        });
        if (existing) {
            existing.description = roleDef.description;
            await roleRepo.save(existing);
            continue;
        }
        const role = roleRepo.create(roleDef);
        await roleRepo.save(role);
    }
}
//# sourceMappingURL=role.seeder.js.map