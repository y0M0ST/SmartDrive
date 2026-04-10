"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeAgencyStatus = exports.updateAgency = exports.createAgency = exports.getAgencies = void 0;
const typeorm_1 = require("typeorm");
const app_error_1 = require("../../common/errors/app-error");
const data_source_1 = require("../../config/data-source");
const agency_entity_1 = require("../../entities/agency.entity");
const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    AGENCY_ADMIN: 'AGENCY_ADMIN',
};
function ensureAdminActor(actor) {
    if (![ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN].includes(actor.role)) {
        throw new app_error_1.AppError('Ban khong co quyen truy cap du lieu nha xe.', 403);
    }
}
function ensureSuperAdmin(actor) {
    if (actor.role !== ROLES.SUPER_ADMIN) {
        throw new app_error_1.AppError('Chi super admin moi duoc thuc hien thao tac nay.', 403);
    }
}
const getAgencies = async (query, actor) => {
    ensureAdminActor(actor);
    const agencyRepo = data_source_1.AppDataSource.getRepository(agency_entity_1.Agency);
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const qb = agencyRepo
        .createQueryBuilder('agency')
        .select([
        'agency.id',
        'agency.code',
        'agency.name',
        'agency.address',
        'agency.phone',
        'agency.status',
        'agency.created_at',
        'agency.updated_at',
    ])
        .where('1=1');
    if (actor.role === ROLES.AGENCY_ADMIN) {
        if (!actor.agency_id) {
            throw new app_error_1.AppError('Tai khoan agency admin khong hop le.', 403);
        }
        qb.andWhere('agency.id = :agencyId', { agencyId: actor.agency_id });
    }
    if (query.status) {
        qb.andWhere('agency.status = :status', { status: query.status });
    }
    if (query.search) {
        qb.andWhere(new typeorm_1.Brackets((subQb) => {
            subQb
                .where('agency.name ILIKE :search', {
                search: `%${query.search}%`,
            })
                .orWhere('agency.code ILIKE :search', {
                search: `%${query.search}%`,
            });
        }));
    }
    const [agencies, total] = await qb
        .orderBy('agency.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    return {
        data: agencies,
        meta: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAgencies = getAgencies;
const createAgency = async (input, actor) => {
    ensureSuperAdmin(actor);
    const agencyRepo = data_source_1.AppDataSource.getRepository(agency_entity_1.Agency);
    const exists = await agencyRepo.findOne({
        where: [{ code: input.code }, ...(input.phone ? [{ phone: input.phone }] : [])],
    });
    if (exists) {
        throw new app_error_1.AppError('Ma nha xe hoac so dien thoai da ton tai.', 409);
    }
    const agency = agencyRepo.create({
        code: input.code,
        name: input.name,
        address: input.address,
        phone: input.phone,
        status: 'ACTIVE',
    });
    await agencyRepo.save(agency);
    return agency;
};
exports.createAgency = createAgency;
const updateAgency = async (id, input, actor) => {
    ensureSuperAdmin(actor);
    const agencyRepo = data_source_1.AppDataSource.getRepository(agency_entity_1.Agency);
    const agency = await agencyRepo.findOneBy({ id });
    if (!agency)
        throw new app_error_1.AppError('Khong tim thay nha xe.', 404);
    if (input.phone && input.phone !== agency.phone) {
        const duplicatePhone = await agencyRepo.findOne({
            where: { phone: input.phone },
        });
        if (duplicatePhone) {
            throw new app_error_1.AppError('So dien thoai nha xe da ton tai.', 409);
        }
    }
    Object.assign(agency, input);
    await agencyRepo.save(agency);
    return true;
};
exports.updateAgency = updateAgency;
const changeAgencyStatus = async (id, status, actor) => {
    ensureSuperAdmin(actor);
    const agencyRepo = data_source_1.AppDataSource.getRepository(agency_entity_1.Agency);
    const agency = await agencyRepo.findOneBy({ id });
    if (!agency)
        throw new app_error_1.AppError('Khong tim thay nha xe.', 404);
    agency.status = status;
    await agencyRepo.save(agency);
    return true;
};
exports.changeAgencyStatus = changeAgencyStatus;
//# sourceMappingURL=agency.service.js.map