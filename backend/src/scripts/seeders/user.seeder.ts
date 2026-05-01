import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { UserStatus } from '../../common/constants/enums';

const DEFAULT_PASSWORD = '@Password123';

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
        {
            username: 'superadmin',
            full_name: 'Super Admin',
            email: 'phucnguyen2812kuwin+admin.superadmin@zulieu9.com',
            phone: '0988000001',
            roleName: 'SUPER_ADMIN',
            status: UserStatus.ACTIVE,
        },
    ];

    for (let i = 1; i <= 10; i += 1) {
        const suffix = String(i).padStart(2, '0');
        users.push({
            username: `agencyadmin${suffix}`,
            full_name: `Agency Admin ${suffix}`,
            email: `phucnguyen2812kuwin+agency.admin${suffix}@zulieu9.com`,
            phone: `09881${String(i).padStart(5, '0')}`,
            roleName: 'AGENCY_ADMIN',
            agencyCode: `AGENCY_${suffix}`,
            status: UserStatus.ACTIVE,
        });
    }

    for (let i = 1; i <= 15; i += 1) {
        const suffix = String(i).padStart(2, '0');
        users.push({
            username: `dispatcher${suffix}`,
            full_name: `Dispatcher ${suffix}`,
            email: `phucnguyen2812kuwin+agency.dispatcher${suffix}@zulieu9.com`,
            phone: `09882${String(i).padStart(5, '0')}`,
            roleName: 'DISPATCHER',
            agencyCode: `AGENCY_${String(((i - 1) % 10) + 1).padStart(2, '0')}`,
            status: i === 15 ? UserStatus.BLOCKED : UserStatus.ACTIVE,
        });
    }

    for (let i = 1; i <= 20; i += 1) {
        const suffix = String(i).padStart(2, '0');
        users.push({
            username: `driver${suffix}`,
            full_name: `Driver ${suffix}`,
            email: `phucnguyen2812kuwin+driver${suffix}@zulieu9.com`,
            phone: `09883${String(i).padStart(5, '0')}`,
            roleName: 'DRIVER',
            agencyCode: `AGENCY_${String(((i - 1) % 10) + 1).padStart(2, '0')}`,
            status: i <= 2 ? UserStatus.INACTIVE : UserStatus.ACTIVE,
        });
    }

    for (let i = 1; i <= 24; i += 1) {
        const suffix = String(i).padStart(2, '0');
        users.push({
            username: `viewer${suffix}`,
            full_name: `Viewer ${suffix}`,
            email: `phucnguyen2812kuwin+agency.viewer${suffix}@zulieu9.com`,
            phone: `09884${String(i).padStart(5, '0')}`,
            roleName: 'VIEWER',
            agencyCode: `AGENCY_${String(((i - 1) % 10) + 1).padStart(2, '0')}`,
            status: i === 24 ? UserStatus.BLOCKED : UserStatus.ACTIVE,
        });
    }

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

        const existing = await userRepo.findOne({
            where: { username: seed.username },
        });

        if (existing) {
            existing.full_name = seed.full_name;
            existing.email = seed.email;
            existing.phone = seed.phone;
            existing.role_id = role.id;
            existing.agency_id = agency?.id ?? null;
            existing.status = seed.status ?? UserStatus.ACTIVE;
            existing.password_hash = hashedPassword;
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
