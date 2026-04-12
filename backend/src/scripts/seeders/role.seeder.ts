import { AppDataSource } from '../../config/data-source';
import { Role } from '../../entities/role.entity';

const ROLE_DEFINITIONS = [
    { name: 'SUPER_ADMIN', description: 'Global system administrator' },
    { name: 'AGENCY_ADMIN', description: 'Agency-level administrator' },
    { name: 'DISPATCHER', description: 'Operations dispatcher' },
    { name: 'DRIVER', description: 'Vehicle driver account' },
    { name: 'VIEWER', description: 'Read-only agency staff account' },
];

export async function seedRoles(): Promise<void> {
    const roleRepo = AppDataSource.getRepository(Role);

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
