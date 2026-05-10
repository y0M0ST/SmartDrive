import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { RolePermission } from '../../entities/role-permission.entity';

/** Hệ thống chỉ còn 3 vai trò chính (SmartDrive). */
const ROLE_DEFINITIONS = [
    { name: 'SUPER_ADMIN', description: 'Global system administrator' },
    { name: 'AGENCY_ADMIN', description: 'Agency-level administrator' },
    { name: 'DRIVER', description: 'Vehicle driver account' },
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

/** Role đã bỏ khỏi hệ thống — user được chuyển sang AGENCY_ADMIN rồi xóa bản ghi role cũ. */
const OBSOLETE_ROLE_NAMES = ['DISPATCHER', 'VIEWER', 'COORDINATOR'] as const;

/**
 * Gán lại tài khoản đang trỏ tới role cũ → AGENCY_ADMIN, xóa `role_permissions` và hàng `roles` thừa.
 * Chạy sau `seedRoles` để DB chỉ còn 3 role hợp lệ (trừ bản ghi orphan nếu có).
 */
export async function migrateAndRemoveObsoleteRoles(): Promise<void> {
    const roleRepo = AppDataSource.getRepository(Role);
    const userRepo = AppDataSource.getRepository(User);
    const rpRepo = AppDataSource.getRepository(RolePermission);

    const agencyAdmin = await roleRepo.findOne({ where: { name: 'AGENCY_ADMIN' } });
    if (!agencyAdmin) return;

    const obsolete = await roleRepo.find({
        where: { name: In([...OBSOLETE_ROLE_NAMES]) },
    });
    if (obsolete.length === 0) return;

    const obsoleteIds = obsolete.map((r) => r.id);
    await userRepo.update({ role_id: In(obsoleteIds) }, { role_id: agencyAdmin.id });
    await rpRepo.delete({ role_id: In(obsoleteIds) });
    await roleRepo.delete({ id: In(obsoleteIds) });
}
