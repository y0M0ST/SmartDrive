import { ILike, In, Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Route } from '../../entities/route.entity';
import { Trip } from '../../entities/trip.entity';
import { RouteStatus, TripStatus } from '../../common/constants/enums';
import { CreateRouteInput, UpdateRouteInput, GetRouteQuery } from './route.dto';
import { AppError } from '../../common/errors/app-error';
import { normalizeVietnamProvinceCode } from '../provinces/province.constant';

const normalizeText = (value: string) => value.trim();
const generateRouteCode = () => `RT-${Math.floor(10000 + Math.random() * 90000)}`;

/**
 * Trùng nghiệp vụ: cùng agency, cùng tên + mã điểm đi + mã điểm đến (`start_point` / `end_point` là mã VIETNAM_PROVINCES).
 */
const findConflictingRoute = async (
    routeRepo: Repository<Route>,
    agencyId: string,
    name: string,
    startPoint: string,
    endPoint: string,
    excludeRouteId?: string,
) => {
    const qb = routeRepo
        .createQueryBuilder('r')
        .where('r.agency_id = :agencyId', { agencyId })
        .andWhere('LOWER(TRIM(r.name)) = LOWER(TRIM(:name))', { name })
        .andWhere('r.start_point = :sp', { sp: startPoint })
        .andWhere('r.end_point = :ep', { ep: endPoint });
    if (excludeRouteId) {
        qb.andWhere('r.id != :excludeId', { excludeId: excludeRouteId });
    }
    return qb.getOne();
};

const generateUniqueRouteCode = async (routeRepo: Repository<Route>, agencyId: string) => {
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const code = generateRouteCode();
        const existed = await routeRepo.findOneBy({ agency_id: agencyId, code });
        if (!existed) return code;
    }
    throw new AppError('Không thể tạo mã tuyến duy nhất, vui lòng thử lại.', 500);
};

// ==========================================
// 1. LẤY DANH SÁCH (Kèm Phân trang, Search)
// ==========================================
export const getRoutes = async (query: GetRouteQuery, agencyId: string) => {
    const routeRepo = AppDataSource.getRepository(Route);
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereCondition: any = { agency_id: agencyId };
    if (query.status) whereCondition.status = query.status;
    if (query.search) {
        whereCondition.name = ILike(`%${query.search}%`); // Tìm theo tên tuyến
    }

    const [routes, total] = await routeRepo.findAndCount({
        where: whereCondition,
        order: { created_at: 'DESC' },
        skip,
        take: limit,
    });

    return {
        data: routes,
        meta: { total, currentPage: page, totalPages: Math.ceil(total / limit) }
    };
};

// ==========================================
// 2. THÊM TUYẾN MỚI
// ==========================================
export const createRoute = async (agencyId: string, input: CreateRouteInput) => {
    const routeRepo = AppDataSource.getRepository(Route);
    const normalizedStart = normalizeVietnamProvinceCode(input.start_point);
    const normalizedEnd = normalizeVietnamProvinceCode(input.end_point);
    const normalizedName = normalizeText(input.name);

    if (normalizedStart === normalizedEnd) {
        throw new AppError('Điểm xuất phát và Điểm đến không được trùng nhau!', 400);
    }

    const duplicate = await findConflictingRoute(
        routeRepo,
        agencyId,
        normalizedName,
        normalizedStart,
        normalizedEnd,
    );
    if (duplicate) {
        throw new AppError(
            'Đã tồn tại tuyến trùng tên và lộ trình (điểm đi / điểm đến) trong nhà xe.',
            409,
        );
    }

    // Sinh mã tuyến đường tự động (VD: RT-9921), có retry chống trùng
    const code = await generateUniqueRouteCode(routeRepo, agencyId);

    const newRoute = routeRepo.create({
        ...input,
        name: normalizedName,
        start_point: normalizedStart,
        end_point: normalizedEnd,
        agency_id: agencyId,
        code,
        status: RouteStatus.ACTIVE,
    });

    return await routeRepo.save(newRoute);
};

// ==========================================
// 3. CẬP NHẬT TUYẾN ĐƯỜNG
// ==========================================
export const updateRoute = async (agencyId: string, routeId: string, input: UpdateRouteInput) => {
    const routeRepo = AppDataSource.getRepository(Route);
    const route = await routeRepo.findOneBy({ id: routeId, agency_id: agencyId });

    if (!route) throw new AppError('Không tìm thấy tuyến đường', 404);

    const nextStart =
        input.start_point !== undefined
            ? normalizeVietnamProvinceCode(input.start_point)
            : route.start_point;
    const nextEnd =
        input.end_point !== undefined ? normalizeVietnamProvinceCode(input.end_point) : route.end_point;
    if (nextStart === nextEnd) {
        throw new AppError('Điểm xuất phát và Điểm đến không được trùng nhau!', 400);
    }

    const nextName = input.name !== undefined ? normalizeText(input.name) : route.name;
    const duplicate = await findConflictingRoute(
        routeRepo,
        agencyId,
        nextName,
        nextStart,
        nextEnd,
        routeId,
    );
    if (duplicate) {
        throw new AppError(
            'Đã tồn tại tuyến trùng tên và lộ trình (điểm đi / điểm đến) trong nhà xe.',
            409,
        );
    }

    Object.assign(route, {
        ...input,
        ...(input.name !== undefined ? { name: normalizeText(input.name) } : {}),
        ...(input.start_point !== undefined ? { start_point: nextStart } : {}),
        ...(input.end_point !== undefined ? { end_point: nextEnd } : {}),
    });
    await routeRepo.save(route);
    return true;
};

// ==========================================
// 4. ĐỔI TRẠNG THÁI (ĐANG KHAI THÁC / TẠM NGƯNG)
// ==========================================
export const changeRouteStatus = async (agencyId: string, routeId: string, status: RouteStatus) => {
    const routeRepo = AppDataSource.getRepository(Route);
    const route = await routeRepo.findOneBy({ id: routeId, agency_id: agencyId });
    if (!route) throw new AppError('Không tìm thấy tuyến đường', 404);

    route.status = status;
    await routeRepo.save(route);
    return true;
};

// ==========================================
// 5. XÓA TUYẾN ĐƯỜNG (SOFT DELETE)
// ==========================================
export const deleteRoute = async (agencyId: string, routeId: string) => {
    const routeRepo = AppDataSource.getRepository(Route);
    const tripRepo = AppDataSource.getRepository(Trip);

    const route = await routeRepo.findOneBy({ id: routeId, agency_id: agencyId });
    if (!route) throw new AppError('Không tìm thấy tuyến đường', 404);

    // RÀNG BUỘC THEO US_07: Check xem có chuyến đi nào đang xài tuyến này không
    const activeTripsCount = await tripRepo.count({
        where: {
            route_id: routeId,
            status: In([TripStatus.SCHEDULED, TripStatus.IN_PROGRESS])
        }
    });

    if (activeTripsCount > 0) {
        throw new AppError(
            'Tuyến đường này đang có chuyến đi (Chưa chạy hoặc Đang chạy). Không thể xóa, vui lòng chuyển sang "Tạm ngưng"!',
            400,
        );
    }

    await routeRepo.softDelete(routeId);
    return true;
};