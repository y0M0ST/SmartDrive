"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRoute = exports.changeRouteStatus = exports.updateRoute = exports.createRoute = exports.getRoutes = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../../config/data-source");
const route_entity_1 = require("../../entities/route.entity");
const trip_entity_1 = require("../../entities/trip.entity");
const enums_1 = require("../../common/constants/enums");
const app_error_1 = require("../../common/errors/app-error");
const normalizeText = (value) => value.trim();
const normalizeForCompare = (value) => normalizeText(value).toLocaleLowerCase();
const generateRouteCode = () => `RT-${Math.floor(10000 + Math.random() * 90000)}`;
/**
 * Trùng nghiệp vụ: cùng agency, cùng tên + điểm đi + điểm đến (không phân biệt hoa thường, trim khoảng trắng).
 */
const findConflictingRoute = async (routeRepo, agencyId, name, startPoint, endPoint, excludeRouteId) => {
    const qb = routeRepo
        .createQueryBuilder('r')
        .where('r.agency_id = :agencyId', { agencyId })
        .andWhere('LOWER(TRIM(r.name)) = LOWER(TRIM(:name))', { name })
        .andWhere('LOWER(TRIM(r.start_point)) = LOWER(TRIM(:sp))', { sp: startPoint })
        .andWhere('LOWER(TRIM(r.end_point)) = LOWER(TRIM(:ep))', { ep: endPoint });
    if (excludeRouteId) {
        qb.andWhere('r.id != :excludeId', { excludeId: excludeRouteId });
    }
    return qb.getOne();
};
const generateUniqueRouteCode = async (routeRepo, agencyId) => {
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const code = generateRouteCode();
        const existed = await routeRepo.findOneBy({ agency_id: agencyId, code });
        if (!existed)
            return code;
    }
    throw new app_error_1.AppError('Không thể tạo mã tuyến duy nhất, vui lòng thử lại.', 500);
};
// ==========================================
// 1. LẤY DANH SÁCH (Kèm Phân trang, Search)
// ==========================================
const getRoutes = async (query, agencyId) => {
    const routeRepo = data_source_1.AppDataSource.getRepository(route_entity_1.Route);
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const whereCondition = { agency_id: agencyId };
    if (query.status)
        whereCondition.status = query.status;
    if (query.search) {
        whereCondition.name = (0, typeorm_1.ILike)(`%${query.search}%`); // Tìm theo tên tuyến
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
exports.getRoutes = getRoutes;
// ==========================================
// 2. THÊM TUYẾN MỚI
// ==========================================
const createRoute = async (agencyId, input) => {
    const routeRepo = data_source_1.AppDataSource.getRepository(route_entity_1.Route);
    const normalizedStart = normalizeText(input.start_point);
    const normalizedEnd = normalizeText(input.end_point);
    const normalizedName = normalizeText(input.name);
    if (normalizeForCompare(normalizedStart) === normalizeForCompare(normalizedEnd)) {
        throw new app_error_1.AppError('Điểm xuất phát và Điểm đến không được trùng nhau!', 400);
    }
    const duplicate = await findConflictingRoute(routeRepo, agencyId, normalizedName, normalizedStart, normalizedEnd);
    if (duplicate) {
        throw new app_error_1.AppError('Đã tồn tại tuyến trùng tên và lộ trình (điểm đi / điểm đến) trong nhà xe.', 409);
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
        status: enums_1.RouteStatus.ACTIVE,
    });
    return await routeRepo.save(newRoute);
};
exports.createRoute = createRoute;
// ==========================================
// 3. CẬP NHẬT TUYẾN ĐƯỜNG
// ==========================================
const updateRoute = async (agencyId, routeId, input) => {
    const routeRepo = data_source_1.AppDataSource.getRepository(route_entity_1.Route);
    const route = await routeRepo.findOneBy({ id: routeId, agency_id: agencyId });
    if (!route)
        throw new app_error_1.AppError('Không tìm thấy tuyến đường', 404);
    const nextStart = input.start_point !== undefined ? normalizeText(input.start_point) : route.start_point;
    const nextEnd = input.end_point !== undefined ? normalizeText(input.end_point) : route.end_point;
    if (normalizeForCompare(nextStart) === normalizeForCompare(nextEnd)) {
        throw new app_error_1.AppError('Điểm xuất phát và Điểm đến không được trùng nhau!', 400);
    }
    const nextName = input.name !== undefined ? normalizeText(input.name) : route.name;
    const duplicate = await findConflictingRoute(routeRepo, agencyId, nextName, nextStart, nextEnd, routeId);
    if (duplicate) {
        throw new app_error_1.AppError('Đã tồn tại tuyến trùng tên và lộ trình (điểm đi / điểm đến) trong nhà xe.', 409);
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
exports.updateRoute = updateRoute;
// ==========================================
// 4. ĐỔI TRẠNG THÁI (ĐANG KHAI THÁC / TẠM NGƯNG)
// ==========================================
const changeRouteStatus = async (agencyId, routeId, status) => {
    const routeRepo = data_source_1.AppDataSource.getRepository(route_entity_1.Route);
    const route = await routeRepo.findOneBy({ id: routeId, agency_id: agencyId });
    if (!route)
        throw new app_error_1.AppError('Không tìm thấy tuyến đường', 404);
    route.status = status;
    await routeRepo.save(route);
    return true;
};
exports.changeRouteStatus = changeRouteStatus;
// ==========================================
// 5. XÓA TUYẾN ĐƯỜNG (SOFT DELETE)
// ==========================================
const deleteRoute = async (agencyId, routeId) => {
    const routeRepo = data_source_1.AppDataSource.getRepository(route_entity_1.Route);
    const tripRepo = data_source_1.AppDataSource.getRepository(trip_entity_1.Trip);
    const route = await routeRepo.findOneBy({ id: routeId, agency_id: agencyId });
    if (!route)
        throw new app_error_1.AppError('Không tìm thấy tuyến đường', 404);
    // RÀNG BUỘC THEO US_07: Check xem có chuyến đi nào đang xài tuyến này không
    const activeTripsCount = await tripRepo.count({
        where: {
            route_id: routeId,
            status: (0, typeorm_1.In)([enums_1.TripStatus.SCHEDULED, enums_1.TripStatus.IN_PROGRESS])
        }
    });
    if (activeTripsCount > 0) {
        throw new app_error_1.AppError('Tuyến đường này đang có chuyến đi (Chưa chạy hoặc Đang chạy). Không thể xóa, vui lòng chuyển sang "Tạm ngưng"!', 400);
    }
    await routeRepo.softDelete(routeId);
    return true;
};
exports.deleteRoute = deleteRoute;
//# sourceMappingURL=route.service.js.map