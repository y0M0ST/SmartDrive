"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.changeUserStatus = exports.updateUser = exports.createUser = exports.getUsers = void 0;
exports.assertUniqueEmailPhoneByAgency = assertUniqueEmailPhoneByAgency;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const typeorm_1 = require("typeorm");
const data_source_1 = require("../../config/data-source");
const user_entity_1 = require("../../entities/user.entity");
const driver_profile_entity_1 = require("../../entities/driver-profile.entity");
const trip_entity_1 = require("../../entities/trip.entity");
const enums_1 = require("../../common/constants/enums");
const app_error_1 = require("../../common/errors/app-error");
const role_entity_1 = require("../../entities/role.entity");
const user_session_entity_1 = require("../../entities/user-session.entity");
const mailer_1 = require("../../utils/mailer");
const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    AGENCY_ADMIN: 'AGENCY_ADMIN',
    DISPATCHER: 'DISPATCHER',
    DRIVER: 'DRIVER',
    VIEWER: 'VIEWER',
};
/** Agency Admin chỉ được tạo tài xế (role thấp hơn, vận hành thực tế). */
const AGENCY_ADMIN_CREATEABLE_ROLES = new Set([ROLES.DRIVER]);
/** Super Admin chỉ được tạo Quản lý nhà xe (AGENCY_ADMIN) qua API users. */
const SUPER_ADMIN_CREATABLE_USER_ROLES = new Set([ROLES.AGENCY_ADMIN]);
function ensureAdminActor(actor) {
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.AGENCY_ADMIN) {
        throw new app_error_1.AppError('Ban khong co quyen quan ly tai khoan.', 403);
    }
}
function canManageUser(actor, target) {
    if (actor.role === ROLES.SUPER_ADMIN)
        return true;
    return actor.agency_id !== null && target.agency_id === actor.agency_id;
}
async function resolveRoleById(roleId) {
    const roleRepo = data_source_1.AppDataSource.getRepository(role_entity_1.Role);
    const role = await roleRepo.findOneBy({ id: roleId });
    if (!role)
        throw new app_error_1.AppError('Vai tro khong ton tai.', 400);
    return role;
}
async function assertUniqueEmailPhoneByAgency(agencyId, email, phone, excludeUserId) {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    if (!email && !phone)
        return;
    const query = userRepository
        .createQueryBuilder('u')
        .withDeleted()
        .where(agencyId ? 'u.agency_id = :agencyId' : 'u.agency_id IS NULL', {
        agencyId: agencyId ?? undefined,
    });
    query.andWhere(new typeorm_1.Brackets((qb) => {
        if (email)
            qb.orWhere('u.email = :email', { email });
        if (phone)
            qb.orWhere('u.phone = :phone', { phone });
    }));
    if (excludeUserId) {
        query.andWhere('u.id <> :excludeUserId', { excludeUserId });
    }
    const existing = await query.getOne();
    if (existing) {
        throw new app_error_1.AppError('Email hoac so dien thoai da ton tai trong nha xe nay.', 409);
    }
}
function generateStrongTemporaryPassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.?';
    const allChars = `${lowercase}${uppercase}${digits}${specials}`;
    const pick = (source) => source[Math.floor(Math.random() * source.length)];
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
const getUsers = async (query, actor) => {
    ensureAdminActor(actor);
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
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
    }
    else if (query.agency_id) {
        qb.andWhere('user.agency_id = :agencyId', { agencyId: query.agency_id });
    }
    if (query.role_id)
        qb.andWhere('user.role_id = :roleId', { roleId: query.role_id });
    if (query.status)
        qb.andWhere('user.status = :status', { status: query.status });
    if (query.search) {
        qb.andWhere(new typeorm_1.Brackets((subQb) => {
            subQb
                .where('user.full_name ILIKE :search', {
                search: `%${query.search}%`,
            })
                .orWhere('user.email ILIKE :search', {
                search: `%${query.search}%`,
            });
        }));
    }
    const [users, total] = await qb
        .orderBy('user.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    const profileRepo = data_source_1.AppDataSource.getRepository(driver_profile_entity_1.DriverProfile);
    const ids = users.map((u) => u.id);
    const profiles = ids.length > 0
        ? await profileRepo.find({
            where: { user_id: (0, typeorm_1.In)(ids) },
            select: ['user_id', 'driver_code'],
        })
        : [];
    const profileByUser = new Map(profiles.map((p) => [p.user_id, p.driver_code]));
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
exports.getUsers = getUsers;
// ==========================================
// 2. THÊM TÀI KHOẢN MỚI
// ==========================================
const createUser = async (input, actor) => {
    ensureAdminActor(actor);
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const role = await resolveRoleById(input.role_id);
    if (actor.role === ROLES.AGENCY_ADMIN &&
        !AGENCY_ADMIN_CREATEABLE_ROLES.has(role.name)) {
        throw new app_error_1.AppError('Agency admin khong duoc tao role nay.', 403);
    }
    if (actor.role === ROLES.SUPER_ADMIN &&
        !SUPER_ADMIN_CREATABLE_USER_ROLES.has(role.name)) {
        throw new app_error_1.AppError('Super admin chi duoc tao tai khoan Quan ly nha xe (AGENCY_ADMIN).', 403);
    }
    const targetAgencyId = actor.role === ROLES.SUPER_ADMIN
        ? (input.agency_id ?? null)
        : actor.agency_id;
    if (actor.role === ROLES.AGENCY_ADMIN && !targetAgencyId) {
        throw new app_error_1.AppError('Tai khoan agency admin khong hop le.', 403);
    }
    if (role.name !== ROLES.SUPER_ADMIN && !targetAgencyId) {
        throw new app_error_1.AppError('Tai khoan khong phai super admin bat buoc co agency.', 400);
    }
    await assertUniqueEmailPhoneByAgency(targetAgencyId, input.email, input.phone);
    const temporaryPassword = generateStrongTemporaryPassword(12);
    const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 10);
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
        await (0, mailer_1.sendNewAccountCredentialsEmail)(newUser.email, newUser.full_name, temporaryPassword, newUser.phone);
    }
    catch (error) {
        await userRepository.delete({ id: newUser.id });
        throw new app_error_1.AppError('Tao tai khoan that bai do khong gui duoc email thong tin dang nhap.', 500);
    }
    return {
        id: newUser.id,
        email: newUser.email,
        credentialEmailSent: true,
    };
};
exports.createUser = createUser;
// ==========================================
// 3. CẬP NHẬT TÀI KHOẢN
// ==========================================
const updateUser = async (id, input, actor) => {
    ensureAdminActor(actor);
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const user = await userRepository.findOne({
        where: { id },
        relations: ['role'],
    });
    if (!user)
        throw new app_error_1.AppError('Khong tim thay nguoi dung.', 404);
    if (!canManageUser(actor, user)) {
        throw new app_error_1.AppError('Ban khong duoc cap nhat tai khoan ngoai pham vi agency.', 403);
    }
    if (input.role_id) {
        const targetRole = await resolveRoleById(input.role_id);
        if (actor.role === ROLES.AGENCY_ADMIN &&
            !AGENCY_ADMIN_CREATEABLE_ROLES.has(targetRole.name)) {
            throw new app_error_1.AppError('Agency admin khong duoc gan role nay.', 403);
        }
        if (actor.role === ROLES.SUPER_ADMIN &&
            !SUPER_ADMIN_CREATABLE_USER_ROLES.has(targetRole.name)) {
            throw new app_error_1.AppError('Super admin chi duoc gan role AGENCY_ADMIN.', 403);
        }
    }
    if (input.email || input.phone) {
        await assertUniqueEmailPhoneByAgency(user.agency_id ?? null, input.email, input.phone, id);
    }
    Object.assign(user, input);
    await userRepository.save(user);
    return true;
};
exports.updateUser = updateUser;
// ==========================================
// 4. KHÓA / MỞ KHÓA TÀI KHOẢN
// ==========================================
const changeUserStatus = async (id, status, actor) => {
    ensureAdminActor(actor);
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
    const user = await userRepository.findOneBy({ id });
    if (!user)
        throw new app_error_1.AppError('Khong tim thay nguoi dung.', 404);
    if (!canManageUser(actor, user)) {
        throw new app_error_1.AppError('Ban khong duoc thay doi trang thai tai khoan ngoai agency.', 403);
    }
    user.status = status;
    await userRepository.save(user);
    if (status === 'BLOCKED') {
        await sessionRepository.update({ user_id: user.id, revoked_at: (0, typeorm_1.IsNull)() }, { revoked_at: new Date() });
    }
    return true;
};
exports.changeUserStatus = changeUserStatus;
// ==========================================
// 5. XÓA TÀI KHOẢN (SOFT DELETE + CHECK RÀNG BUỘC)
// ==========================================
const deleteUser = async (id, actor) => {
    ensureAdminActor(actor);
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const tripRepository = data_source_1.AppDataSource.getRepository(trip_entity_1.Trip);
    const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
    const roleRepository = data_source_1.AppDataSource.getRepository(role_entity_1.Role);
    const user = await userRepository.findOneBy({ id });
    if (!user)
        throw new app_error_1.AppError('Khong tim thay nguoi dung.', 404);
    if (user.id === actor.id) {
        throw new app_error_1.AppError('Khong the tu xoa tai khoan dang dang nhap.', 400);
    }
    if (!canManageUser(actor, user)) {
        throw new app_error_1.AppError('Ban khong duoc xoa tai khoan ngoai agency.', 403);
    }
    const role = await roleRepository.findOneBy({ id: user.role_id });
    if (role?.name === ROLES.DRIVER) {
        const activeTripsCount = await tripRepository.count({
            where: {
                driver_id: id,
                status: (0, typeorm_1.In)([enums_1.TripStatus.SCHEDULED, enums_1.TripStatus.IN_PROGRESS]),
            },
        });
        if (activeTripsCount > 0) {
            throw new app_error_1.AppError('Tai xe dang co chuyen hoat dong. Vui long khoa tai khoan thay vi xoa.', 400);
        }
    }
    await sessionRepository.update({ user_id: user.id, revoked_at: (0, typeorm_1.IsNull)() }, { revoked_at: new Date() });
    await userRepository.softDelete(id);
    return true;
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=user.service.js.map