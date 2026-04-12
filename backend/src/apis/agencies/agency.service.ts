import { Brackets } from 'typeorm';
import { AppError } from '../../common/errors/app-error';
import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';
import {
    CreateAgencyInput,
    GetAgencyQuery,
    UpdateAgencyInput,
} from './agency.dto';

type ActorContext = {
    id: string;
    role: string;
    agency_id: string | null;
};

const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    AGENCY_ADMIN: 'AGENCY_ADMIN',
} as const;

function ensureAdminActor(actor: ActorContext): void {
    if (![ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN].includes(actor.role as any)) {
        throw new AppError('Ban khong co quyen truy cap du lieu nha xe.', 403);
    }
}

function ensureSuperAdmin(actor: ActorContext): void {
    if (actor.role !== ROLES.SUPER_ADMIN) {
        throw new AppError('Chi super admin moi duoc thuc hien thao tac nay.', 403);
    }
}

export const getAgencies = async (query: GetAgencyQuery, actor: ActorContext) => {
    ensureAdminActor(actor);
    const agencyRepo = AppDataSource.getRepository(Agency);
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
            throw new AppError('Tai khoan agency admin khong hop le.', 403);
        }
        qb.andWhere('agency.id = :agencyId', { agencyId: actor.agency_id });
    }

    if (query.status) {
        qb.andWhere('agency.status = :status', { status: query.status });
    }

    if (query.search) {
        qb.andWhere(
            new Brackets((subQb) => {
                subQb
                    .where('agency.name ILIKE :search', {
                        search: `%${query.search}%`,
                    })
                    .orWhere('agency.code ILIKE :search', {
                        search: `%${query.search}%`,
                    });
            }),
        );
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

export const createAgency = async (input: CreateAgencyInput, actor: ActorContext) => {
    ensureSuperAdmin(actor);
    const agencyRepo = AppDataSource.getRepository(Agency);

    const exists = await agencyRepo.findOne({
        where: [{ code: input.code }, ...(input.phone ? [{ phone: input.phone }] : [])],
    });
    if (exists) {
        throw new AppError('Ma nha xe hoac so dien thoai da ton tai.', 409);
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

export const updateAgency = async (
    id: string,
    input: UpdateAgencyInput,
    actor: ActorContext,
) => {
    ensureSuperAdmin(actor);
    const agencyRepo = AppDataSource.getRepository(Agency);

    const agency = await agencyRepo.findOneBy({ id });
    if (!agency) throw new AppError('Khong tim thay nha xe.', 404);

    if (input.phone && input.phone !== agency.phone) {
        const duplicatePhone = await agencyRepo.findOne({
            where: { phone: input.phone },
        });
        if (duplicatePhone) {
            throw new AppError('So dien thoai nha xe da ton tai.', 409);
        }
    }

    Object.assign(agency, input);
    await agencyRepo.save(agency);
    return true;
};

export const changeAgencyStatus = async (
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    actor: ActorContext,
) => {
    ensureSuperAdmin(actor);
    const agencyRepo = AppDataSource.getRepository(Agency);
    const agency = await agencyRepo.findOneBy({ id });
    if (!agency) throw new AppError('Khong tim thay nha xe.', 404);
    agency.status = status;
    await agencyRepo.save(agency);
    return true;
};
