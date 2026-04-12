import bcrypt from 'bcryptjs';
import { Brackets, In, IsNull } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { Trip } from '../../entities/trip.entity';
import { TripStatus } from '../../common/constants/enums';
import { CreateUserInput, UpdateUserInput, GetUserQuery } from './user.dto';
import { AppError } from '../../common/errors/app-error';
import { Role } from '../../entities/role.entity';
import { UserSession } from '../../entities/user-session.entity';
import { sendNewAccountCredentialsEmail } from '../../utils/mailer';

type ActorContext = {
    id: string;
    role: string;
    agency_id: string | null;
};

const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    AGENCY_ADMIN: 'AGENCY_ADMIN',
    DISPATCHER: 'DISPATCHER',
    DRIVER: 'DRIVER',
    VIEWER: 'VIEWER',
} as const;

/** Agency Admin chỉ được tạo tài xế (role thấp hơn, vận hành thực tế). */
const AGENCY_ADMIN_CREATEABLE_ROLES: Set<string> = new Set([ROLES.DRIVER]);

/** Super Admin chỉ được tạo Quản lý nhà xe (AGENCY_ADMIN) qua API users. */
const SUPER_ADMIN_CREATABLE_USER_ROLES: Set<string> = new Set([ROLES.AGENCY_ADMIN]);

function ensureAdminActor(actor: ActorContext): void {
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.AGENCY_ADMIN) {
        throw new AppError('Ban khong co quyen quan ly tai khoan.', 403);
    }
}

function canManageUser(actor: ActorContext, target: User): boolean {
    if (actor.role === ROLES.SUPER_ADMIN) return true;
    return actor.agency_id !== null && target.agency_id === actor.agency_id;
}

async function resolveRoleById(roleId: string): Promise<Role> {
    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOneBy({ id: roleId });
    if (!role) throw new AppError('Vai tro khong ton tai.', 400);
    return role;
}

export async function assertUniqueEmailPhoneByAgency(
    agencyId: string | null,
    email?: string,
    phone?: string,
    excludeUserId?: string,
): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    if (!email && !phone) return;

    const query = userRepository
        .createQueryBuilder('u')
        .withDeleted()
        .where(agencyId ? 'u.agency_id = :agencyId' : 'u.agency_id IS NULL', {
            agencyId: agencyId ?? undefined,
        });

    query.andWhere(
        new Brackets((qb) => {
            if (email) qb.orWhere('u.email = :email', { email });
            if (phone) qb.orWhere('u.phone = :phone', { phone });
        }),
    );

    if (excludeUserId) {
        query.andWhere('u.id <> :excludeUserId', { excludeUserId });
    }

    const existing = await query.getOne();
    if (existing) {
        throw new AppError('Email hoac so dien thoai da ton tai trong nha xe nay.', 409);
    }
}

function generateStrongTemporaryPassword(length = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.?';
    const allChars = `${lowercase}${uppercase}${digits}${specials}`;

    const pick = (source: string) =>
        source[Math.floor(Math.random() * source.length)];

    const required = [
        pick(lowercase),
        pick(uppercase),
        pick(digits),
        pick(specials),
    ];

    while (required.length < length) {
        required.push(pick(allChars));
    }

    for (let i = required.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [required[i], required[j]] = [required[j], required[i]];
    }

    return required.join('');
}

// ==========================================
// 1. LẤY DANH SÁCH & PHÂN TRANG (Kèm Search, Filter)
// ==========================================
export const getUsers = async (query: GetUserQuery, actor: ActorContext) => {
    ensureAdminActor(actor);
    const userRepository = AppDataSource.getRepository(User);
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const qb = userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .select([
            'user.id',
            'user.full_name',
            'user.email',
            'user.phone',
            'user.status',
            'user.created_at',
            'user.last_login_at',
            'user.agency_id',
            'role.id',
            'role.name',
            'role.description',
        ])
        .where('1=1');

    if (actor.role === ROLES.AGENCY_ADMIN) {
        qb.andWhere('user.agency_id = :agencyId', { agencyId: actor.agency_id });
    } else if (query.agency_id) {
        qb.andWhere('user.agency_id = :agencyId', { agencyId: query.agency_id });
    }

    if (query.role_id) qb.andWhere('user.role_id = :roleId', { roleId: query.role_id });
    if (query.status) qb.andWhere('user.status = :status', { status: query.status });
    if (query.search) {
        qb.andWhere(
            new Brackets((subQb) => {
                subQb
                    .where('user.full_name ILIKE :search', {
                        search: `%${query.search}%`,
                    })
                    .orWhere('user.email ILIKE :search', {
                        search: `%${query.search}%`,
                    });
            }),
        );
    }

    const [users, total] = await qb
        .orderBy('user.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

    const profileRepo = AppDataSource.getRepository(DriverProfile);
    const ids = users.map((u) => u.id);
    const profiles =
        ids.length > 0
            ? await profileRepo.find({
                  where: { user_id: In(ids) },
                  select: ['user_id', 'driver_code'],
              })
            : [];
    const profileByUser = new Map(
        profiles.map((p) => [p.user_id, p.driver_code] as const),
    );

    const data = users.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        created_at: u.created_at,
        last_login_at: u.last_login_at,
        agency_id: u.agency_id,
        role: u.role,
        driver_code: profileByUser.get(u.id) ?? null,
        has_driver_profile: profileByUser.has(u.id),
    }));

    return {
        data,
        meta: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ==========================================
// 2. THÊM TÀI KHOẢN MỚI
// ==========================================
export const createUser = async (input: CreateUserInput, actor: ActorContext) => {
    ensureAdminActor(actor);
    const userRepository = AppDataSource.getRepository(User);
    const role = await resolveRoleById(input.role_id);

    if (
        actor.role === ROLES.AGENCY_ADMIN &&
        !AGENCY_ADMIN_CREATEABLE_ROLES.has(role.name)
    ) {
        throw new AppError('Agency admin khong duoc tao role nay.', 403);
    }

    if (
        actor.role === ROLES.SUPER_ADMIN &&
        !SUPER_ADMIN_CREATABLE_USER_ROLES.has(role.name)
    ) {
        throw new AppError(
            'Super admin chi duoc tao tai khoan Quan ly nha xe (AGENCY_ADMIN).',
            403,
        );
    }

    const targetAgencyId =
        actor.role === ROLES.SUPER_ADMIN
            ? (input.agency_id ?? null)
            : actor.agency_id;
    if (actor.role === ROLES.AGENCY_ADMIN && !targetAgencyId) {
        throw new AppError('Tai khoan agency admin khong hop le.', 403);
    }

    if (role.name !== ROLES.SUPER_ADMIN && !targetAgencyId) {
        throw new AppError('Tai khoan khong phai super admin bat buoc co agency.', 400);
    }

    await assertUniqueEmailPhoneByAgency(
        targetAgencyId,
        input.email,
        input.phone,
    );

    const temporaryPassword = generateStrongTemporaryPassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const username = input.email.split('@')[0] + Math.floor(Math.random() * 1000);

    const newUser = userRepository.create({
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
        role_id: input.role_id,
        agency_id: targetAgencyId,
        username,
        password_hash: hashedPassword,
    });

    await userRepository.save(newUser);

    try {
        await sendNewAccountCredentialsEmail(
            newUser.email,
            newUser.full_name,
            temporaryPassword,
            newUser.phone,
        );
    } catch (error) {
        await userRepository.delete({ id: newUser.id });
        throw new AppError(
            'Tao tai khoan that bai do khong gui duoc email thong tin dang nhap.',
            500,
        );
    }

    return {
        id: newUser.id,
        email: newUser.email,
        credentialEmailSent: true,
    };
};

// ==========================================
// 3. CẬP NHẬT TÀI KHOẢN
// ==========================================
export const updateUser = async (
    id: string,
    input: UpdateUserInput,
    actor: ActorContext,
) => {
    ensureAdminActor(actor);
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
        where: { id },
        relations: ['role'],
    });
    if (!user) throw new AppError('Khong tim thay nguoi dung.', 404);
    if (!canManageUser(actor, user)) {
        throw new AppError('Ban khong duoc cap nhat tai khoan ngoai pham vi agency.', 403);
    }

    if (input.role_id) {
        const targetRole = await resolveRoleById(input.role_id);
        if (
            actor.role === ROLES.AGENCY_ADMIN &&
            !AGENCY_ADMIN_CREATEABLE_ROLES.has(targetRole.name)
        ) {
            throw new AppError('Agency admin khong duoc gan role nay.', 403);
        }
        if (
            actor.role === ROLES.SUPER_ADMIN &&
            !SUPER_ADMIN_CREATABLE_USER_ROLES.has(targetRole.name)
        ) {
            throw new AppError('Super admin chi duoc gan role AGENCY_ADMIN.', 403);
        }
    }

    if (input.email || input.phone) {
        await assertUniqueEmailPhoneByAgency(
            user.agency_id ?? null,
            input.email,
            input.phone,
            id,
        );
    }

    Object.assign(user, input);
    await userRepository.save(user);
    return true;
};

// ==========================================
// 4. KHÓA / MỞ KHÓA TÀI KHOẢN
// ==========================================
export const changeUserStatus = async (
    id: string,
    status: string,
    actor: ActorContext,
) => {
    ensureAdminActor(actor);
    const userRepository = AppDataSource.getRepository(User);
    const sessionRepository = AppDataSource.getRepository(UserSession);
    const user = await userRepository.findOneBy({ id });
    if (!user) throw new AppError('Khong tim thay nguoi dung.', 404);
    if (!canManageUser(actor, user)) {
        throw new AppError('Ban khong duoc thay doi trang thai tai khoan ngoai agency.', 403);
    }

    user.status = status;
    await userRepository.save(user);

    if (status === 'BLOCKED') {
        await sessionRepository.update(
            { user_id: user.id, revoked_at: IsNull() },
            { revoked_at: new Date() },
        );
    }

    return true;
};

// ==========================================
// 5. XÓA TÀI KHOẢN (SOFT DELETE + CHECK RÀNG BUỘC)
// ==========================================
export const deleteUser = async (id: string, actor: ActorContext) => {
    ensureAdminActor(actor);
    const userRepository = AppDataSource.getRepository(User);
    const tripRepository = AppDataSource.getRepository(Trip);
    const sessionRepository = AppDataSource.getRepository(UserSession);
    const roleRepository = AppDataSource.getRepository(Role);

    const user = await userRepository.findOneBy({ id });
    if (!user) throw new AppError('Khong tim thay nguoi dung.', 404);
    if (user.id === actor.id) {
        throw new AppError('Khong the tu xoa tai khoan dang dang nhap.', 400);
    }
    if (!canManageUser(actor, user)) {
        throw new AppError('Ban khong duoc xoa tai khoan ngoai agency.', 403);
    }

    const role = await roleRepository.findOneBy({ id: user.role_id });
    if (role?.name === ROLES.DRIVER) {
        const activeTripsCount = await tripRepository.count({
            where: {
                driver_id: id,
                status: In([TripStatus.SCHEDULED, TripStatus.IN_PROGRESS]),
            },
        });

        if (activeTripsCount > 0) {
            throw new AppError(
                'Tai xe dang co chuyen hoat dong. Vui long khoa tai khoan thay vi xoa.',
                400,
            );
        }
    }

    await sessionRepository.update(
        { user_id: user.id, revoked_at: IsNull() },
        { revoked_at: new Date() },
    );
    await userRepository.softDelete(id);
    return true;
};