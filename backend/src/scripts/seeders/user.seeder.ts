import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { UserStatus } from '../../common/constants/enums';

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD?.trim() || '@Password123';

/**
 * Tao email seed khong gan ten ca nhan trong code.
 * - SEED_USER_EMAIL_DOMAIN: domain (mac dinh example.com — RFC reserved, khong can hop le voi inbox that)
 * - SEED_USER_EMAIL_LOCAL_PREFIX: neu dat (vd catch-all), local = prefix+localKey@domain; bo trong thi localKey@domain
 */
function buildSeedEmail(localKey: string): string {
    const domain = (process.env.SEED_USER_EMAIL_DOMAIN || 'example.com').trim() || 'example.com';
    const prefix = (process.env.SEED_USER_EMAIL_LOCAL_PREFIX || '').trim();
    const local = prefix ? `${prefix}+${localKey}` : localKey;
    return `${local}@${domain}`;
}

type UserSeedInput = {
    username: string;
    full_name: string;
    email: string;
    phone: string;
    roleName: string;
    agencyCode?: string;
    status?: UserStatus;
};

function buildUsersSeed(): UserSeedInput[] {
    const users: UserSeedInput[] = [
        // SUPER_ADMIN + ACTIVE
        {
            username: 'superadmin',
            full_name: 'Super Admin',
            email: buildSeedEmail('admin.superadmin'),
            phone: '0988000001',
            roleName: 'SUPER_ADMIN',
            status: UserStatus.ACTIVE,
        },
        // SUPER_ADMIN + INACTIVE
        {
            username: 'superadmin_inactive',
            full_name: 'Super Admin Inactive',
            email: buildSeedEmail('admin.superadmin.inactive'),
            phone: '0988000002',
            roleName: 'SUPER_ADMIN',
            status: UserStatus.INACTIVE,
        },
        // SUPER_ADMIN + BLOCKED
        {
            username: 'superadmin_blocked',
            full_name: 'Super Admin Blocked',
            email: buildSeedEmail('admin.superadmin.blocked'),
            phone: '0988000003',
            roleName: 'SUPER_ADMIN',
            status: UserStatus.BLOCKED,
        },
    ];

    for (let i = 1; i <= 10; i += 1) {
        const suffix = String(i).padStart(2, '0');
        users.push({
            username: `agencyadmin${suffix}`,
            full_name: `Agency Admin ${suffix}`,
            email: buildSeedEmail(`agency.admin${suffix}`),
            phone: `09881${String(i).padStart(5, '0')}`,
            roleName: 'AGENCY_ADMIN',
            agencyCode: `AGENCY_${suffix}`,
            status: UserStatus.ACTIVE,
        });
    }
    // AGENCY_ADMIN + INACTIVE
    users.push({
        username: 'agencyadmin_inactive',
        full_name: 'Agency Admin Inactive',
        email: buildSeedEmail('agency.admin.inactive'),
        phone: '0988199998',
        roleName: 'AGENCY_ADMIN',
        agencyCode: 'AGENCY_01',
        status: UserStatus.INACTIVE,
    });
    // AGENCY_ADMIN + BLOCKED
    users.push({
        username: 'agencyadmin_blocked',
        full_name: 'Agency Admin Blocked',
        email: buildSeedEmail('agency.admin.blocked'),
        phone: '0988199999',
        roleName: 'AGENCY_ADMIN',
        agencyCode: 'AGENCY_02',
        status: UserStatus.BLOCKED,
    });

    for (let i = 1; i <= 20; i += 1) {
        const suffix = String(i).padStart(2, '0');
        users.push({
            username: `driver${suffix}`,
            full_name: `Driver ${suffix}`,
            email: buildSeedEmail(`driver${suffix}`),
            phone: `09883${String(i).padStart(5, '0')}`,
            roleName: 'DRIVER',
            agencyCode: `AGENCY_${String(((i - 1) % 10) + 1).padStart(2, '0')}`,
            status: i <= 2 ? UserStatus.INACTIVE : UserStatus.ACTIVE,
        });
    }
    // DRIVER + BLOCKED
    users.push({
        username: 'driver_blocked',
        full_name: 'Driver Blocked',
        email: buildSeedEmail('driver.blocked'),
        phone: '0988399999',
        roleName: 'DRIVER',
        agencyCode: 'AGENCY_03',
        status: UserStatus.BLOCKED,
    });

    return users;
}

export async function seedUsers(): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const agencyRepo = AppDataSource.getRepository(Agency);

    const [roles, agencies] = await Promise.all([roleRepo.find(), agencyRepo.find()]);
    const roleMap = new Map(roles.map((role) => [role.name, role]));
    const agencyMap = new Map(agencies.map((agency) => [agency.code, agency]));

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const userSeeds = buildUsersSeed();

    for (const seed of userSeeds) {
        const role = roleMap.get(seed.roleName);
        if (!role) {
            throw new Error(`Missing role for user seeder: ${seed.roleName}`);
        }

        const agency = seed.agencyCode ? agencyMap.get(seed.agencyCode) : undefined;
        if (seed.agencyCode && !agency) {
            throw new Error(`Missing agency for user seeder: ${seed.agencyCode}`);
        }

        // IMPORTANT:
        // users uses soft-delete (deleted_at). If a username exists in soft-deleted state,
        // normal findOne() will not return it, then insert will fail on unique(username).
        const existing = await userRepo.findOne({
            where: { username: seed.username },
            withDeleted: true,
        });

        if (existing) {
            existing.full_name = seed.full_name;
            existing.email = seed.email;
            existing.phone = seed.phone;
            existing.role_id = role.id;
            existing.agency_id = agency?.id ?? null;
            existing.status = seed.status ?? UserStatus.ACTIVE;
            existing.password_hash = hashedPassword;
            // revive soft-deleted user for deterministic/idempotent seeding
            if (existing.deleted_at) {
                existing.deleted_at = null;
            }
            await userRepo.save(existing);
            continue;
        }

        const user = userRepo.create({
            username: seed.username,
            full_name: seed.full_name,
            email: seed.email,
            phone: seed.phone,
            role_id: role.id,
            agency_id: agency?.id ?? null,
            password_hash: hashedPassword,
            status: seed.status ?? UserStatus.ACTIVE,
        });
        await userRepo.save(user);
    }
}
