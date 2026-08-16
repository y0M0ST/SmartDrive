import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { UserStatus } from '../../common/constants/enums';
import { SEED_AGENCY_COUNT } from './agency.seeder';

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD?.trim() || '@Password123';

/** Số tài xế mỗi nhà xe (15 agency × 15 = 225 driver). */
export const SEED_DRIVERS_PER_AGENCY = 15;

const ALL_USER_STATUSES: UserStatus[] = [
    UserStatus.ACTIVE,
    UserStatus.INACTIVE,
    UserStatus.BLOCKED,
];

/**
 * Tạo email seed không gắn tên cá nhân trong code.
 * - SEED_USER_EMAIL_DOMAIN: domain (mặc định example.com)
 * - SEED_USER_EMAIL_LOCAL_PREFIX: nếu đặt (vd catch-all), local = prefix+localKey@domain
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
    status: UserStatus;
};

function buildUsersSeed(): UserSeedInput[] {
    const users: UserSeedInput[] = [];

    // —— 1 Super Admin (đăng nhập chính) ——
    users.push({
        username: 'superadmin',
        full_name: 'Super Admin',
        email: buildSeedEmail('admin.superadmin'),
        phone: '0988000001',
        roleName: 'SUPER_ADMIN',
        status: UserStatus.ACTIVE,
    });

    // —— 15 Agency Admin (mỗi nhà xe 1 admin) ——
    // AGENCY_02 / AGENCY_03: INACTIVE & BLOCKED để phủ đủ status user (cùng với driver bên dưới).
    for (let agencyNo = 1; agencyNo <= SEED_AGENCY_COUNT; agencyNo += 1) {
        const suffix = String(agencyNo).padStart(2, '0');
        const agencyCode = `AGENCY_${suffix}`;

        let status = UserStatus.ACTIVE;
        if (agencyNo === 2) status = UserStatus.INACTIVE;
        if (agencyNo === 3) status = UserStatus.BLOCKED;

        users.push({
            username: `agencyadmin_${suffix}`,
            full_name: `Quản lý nhà xe ${suffix}`,
            email: buildSeedEmail(`agency.admin.${suffix}`),
            phone: `09881${String(agencyNo).padStart(5, '0')}`,
            roleName: 'AGENCY_ADMIN',
            agencyCode,
            status,
        });
    }

    // —— 15 × 15 Driver ——
    for (let agencyNo = 1; agencyNo <= SEED_AGENCY_COUNT; agencyNo += 1) {
        const agencySuffix = String(agencyNo).padStart(2, '0');
        const agencyCode = `AGENCY_${agencySuffix}`;

        for (let driverNo = 1; driverNo <= SEED_DRIVERS_PER_AGENCY; driverNo += 1) {
            const driverSuffix = String(driverNo).padStart(2, '0');
            const username = `driver_${agencySuffix}_${driverSuffix}`;

            let status = UserStatus.ACTIVE;
            // Nhà xe 01: 2 tài xế cuối = INACTIVE + BLOCKED (phủ status còn lại cho role DRIVER).
            if (agencyNo === 1 && driverNo === SEED_DRIVERS_PER_AGENCY - 1) {
                status = UserStatus.INACTIVE;
            }
            if (agencyNo === 1 && driverNo === SEED_DRIVERS_PER_AGENCY) {
                status = UserStatus.BLOCKED;
            }

            users.push({
                username,
                full_name: `Tài xế ${agencySuffix}-${driverSuffix}`,
                email: buildSeedEmail(`driver.${agencySuffix}.${driverSuffix}`),
                phone: `09${String(agencyNo).padStart(2, '0')}${String(driverNo).padStart(3, '0')}`.slice(0, 11),
                roleName: 'DRIVER',
                agencyCode,
                status,
            });
        }
    }

    return users;
}

/** Kiểm tra seed có ít nhất một user cho mỗi UserStatus (ACTIVE / INACTIVE / BLOCKED). */
function assertUserStatusCoverage(seeds: UserSeedInput[]): void {
    const covered = new Set(seeds.map((s) => s.status));
    for (const st of ALL_USER_STATUSES) {
        if (!covered.has(st)) {
            throw new Error(`User seeder thiếu tài khoản trạng thái ${st}`);
        }
    }
}

export async function seedUsers(): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const agencyRepo = AppDataSource.getRepository(Agency);

    const [roles, agencies] = await Promise.all([roleRepo.find(), agencyRepo.find()]);
    const roleMap = new Map(roles.map((role) => [role.name, role]));
    const agencyMap = new Map(agencies.map((agency) => [agency.code, agency]));

    const userSeeds = buildUsersSeed();
    assertUserStatusCoverage(userSeeds);

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

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
            withDeleted: true,
        });

        if (existing) {
            existing.full_name = seed.full_name;
            existing.email = seed.email;
            existing.phone = seed.phone;
            existing.role_id = role.id;
            existing.agency_id = agency?.id ?? null;
            existing.status = seed.status;
            existing.password_hash = hashedPassword;
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
            status: seed.status,
        });
        await userRepo.save(user);
    }

    const superAdminCount = userSeeds.filter((u) => u.roleName === 'SUPER_ADMIN').length;
    const agencyAdminCount = userSeeds.filter((u) => u.roleName === 'AGENCY_ADMIN').length;
    const driverCount = userSeeds.filter((u) => u.roleName === 'DRIVER').length;

    console.log(
        `[seed:users] SUPER_ADMIN=${superAdminCount}, AGENCY_ADMIN=${agencyAdminCount}, DRIVER=${driverCount} (tổng ${userSeeds.length})`,
    );
    console.log(
        `[seed:users] UserStatus: ACTIVE=${userSeeds.filter((u) => u.status === UserStatus.ACTIVE).length}, ` +
            `INACTIVE=${userSeeds.filter((u) => u.status === UserStatus.INACTIVE).length}, ` +
            `BLOCKED=${userSeeds.filter((u) => u.status === UserStatus.BLOCKED).length}`,
    );
}
