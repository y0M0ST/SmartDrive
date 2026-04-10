import { seedAgencies } from './agency.seeder';
import { seedPermissions } from './permission.seeder';
import { seedRolePermissions } from './role-permission.seeder';
import { seedRoles } from './role.seeder';
import { seedUsers } from './user.seeder';

export async function runAllSeeders(): Promise<void> {
    await seedRoles();
    await seedPermissions();
    await seedRolePermissions();
    await seedAgencies();
    await seedUsers();
}
