import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Trip } from '../../entities/trip.entity';
import { Route } from '../../entities/route.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { User } from '../../entities/user.entity';
import { TripStatus, UserStatus, VehicleStatus } from '../../common/constants/enums';
import { AppError, BadRequestException, ConflictException } from '../../common/errors/app-error';
import { computePlannedEndTime, CreateTripInput, GetTripQuery, AvailableSlotQuery } from './trip.dto';

const DRIVER_ROLE_NAME = 'DRIVER';

const generateTripCodeCandidate = () => `TR-${Math.floor(10000 + Math.random() * 90000)}`;

const generateUniqueTripCode = async (tripRepo: Repository<Trip>) => {
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const code = generateTripCodeCandidate();
        const existed = await tripRepo.findOne({ where: { trip_code: code }, withDeleted: true });
        if (!existed) return code;
    }
    throw new AppError('Không thể tạo mã chuyến đi duy nhất, vui lòng thử lại.', 500);
};

const ACTIVE_TRIP_STATUSES = [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] as const;

const overlapSql = 't.departure_time < :newEnd AND t.planned_end_time > :newStart';

/** Có chuyến (SCHEDULED | IN_PROGRESS) trùng khung giờ với tài xế này không. */
export const hasDriverTripOverlap = async (
    agencyId: string,
    driverId: string,
    newStart: Date,
    newEnd: Date,
    excludeTripId?: string,
): Promise<boolean> => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const qb = tripRepo
        .createQueryBuilder('t')
        .where('t.agency_id = :agencyId', { agencyId })
        .andWhere('t.status IN (:...statuses)', { statuses: [...ACTIVE_TRIP_STATUSES] })
        .andWhere(`t.driver_id = :driverId AND ${overlapSql}`, { driverId, newEnd, newStart });
    if (excludeTripId) {
        qb.andWhere('t.id != :excludeTripId', { excludeTripId });
    }
    return (await qb.getOne()) !== null;
};

/** Có chuyến (SCHEDULED | IN_PROGRESS) trùng khung giờ với xe này không. */
export const hasVehicleTripOverlap = async (
    agencyId: string,
    vehicleId: string,
    newStart: Date,
    newEnd: Date,
    excludeTripId?: string,
): Promise<boolean> => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const qb = tripRepo
        .createQueryBuilder('t')
        .where('t.agency_id = :agencyId', { agencyId })
        .andWhere('t.status IN (:...statuses)', { statuses: [...ACTIVE_TRIP_STATUSES] })
        .andWhere(`t.vehicle_id = :vehicleId AND ${overlapSql}`, { vehicleId, newEnd, newStart });
    if (excludeTripId) {
        qb.andWhere('t.id != :excludeTripId', { excludeTripId });
    }
    return (await qb.getOne()) !== null;
};

/**
 * Trùng lịch khi có chuyến khác (SCHEDULED | IN_PROGRESS) mà khoảng
 * [departure_time, planned_end_time) giao với [newStart, newEnd),
 * và (cùng tài xế HOẶC cùng xe).
 * Dùng hai nhánh overlap (tài xế / xe) — tương đương logic đã chốt ở Giai đoạn 1–2.
 */
/** Gộp hai nhánh overlap (tài xế / xe) — cùng điều kiện dùng cho `getAvailableDrivers` / `getAvailableVehicles`. */
export const hasTripScheduleConflict = async (
    agencyId: string,
    driverId: string,
    vehicleId: string,
    newStart: Date,
    newEnd: Date,
    excludeTripId?: string,
): Promise<boolean> => {
    const driverBusy = await hasDriverTripOverlap(agencyId, driverId, newStart, newEnd, excludeTripId);
    if (driverBusy) return true;
    return hasVehicleTripOverlap(agencyId, vehicleId, newStart, newEnd, excludeTripId);
};

export type AvailableDriverDto = { id: string; full_name: string };
export type AvailableVehicleDto = { id: string; license_plate: string; status: string };

export const getAvailableDrivers = async (agencyId: string, q: AvailableSlotQuery): Promise<AvailableDriverDto[]> => {
    const userRepo = AppDataSource.getRepository(User);
    const drivers = await userRepo.find({
        where: { agency_id: agencyId, status: UserStatus.ACTIVE },
        relations: ['role'],
        order: { full_name: 'ASC' },
    });
    const eligible = drivers.filter((u) => u.role?.name === DRIVER_ROLE_NAME);
    const out: AvailableDriverDto[] = [];
    for (const u of eligible) {
        const busy = await hasDriverTripOverlap(agencyId, u.id, q.departure_time, q.planned_end_time);
        if (!busy) out.push({ id: u.id, full_name: u.full_name });
    }
    return out;
};

export const getAvailableVehicles = async (agencyId: string, q: AvailableSlotQuery): Promise<AvailableVehicleDto[]> => {
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const vehicles = await vehicleRepo.find({
        where: { agency_id: agencyId },
        order: { license_plate: 'ASC' },
    });
    const candidates = vehicles.filter((v) => v.status !== VehicleStatus.MAINTENANCE);
    const out: AvailableVehicleDto[] = [];
    for (const v of candidates) {
        const busy = await hasVehicleTripOverlap(agencyId, v.id, q.departure_time, q.planned_end_time);
        if (!busy) out.push({ id: v.id, license_plate: v.license_plate, status: v.status });
    }
    return out;
};

/**
 * Chi tiết chuyến đi (US_11): join Route, Vehicle, Driver + danh sách vi phạm AI mới nhất trước.
 * Bảo mật: chuyến thuộc đúng `agencyId` của token; sai agency → 403, không tồn tại → 404.
 */
export const getTripDetail = async (tripId: string, agencyId: string) => {
    const tripRepo = AppDataSource.getRepository(Trip);

    const trip = await tripRepo.findOne({
        where: { id: tripId },
        relations: ['route', 'vehicle', 'driver', 'ai_violations'],
        order: { ai_violations: { occurred_at: 'DESC' } },
    });

    if (!trip) {
        throw new AppError('Không tìm thấy chuyến đi.', 404);
    }
    if (trip.agency_id !== agencyId) {
        throw new AppError('Bạn không có quyền xem chuyến đi này.', 403);
    }

    return trip;
};

export const getTrips = async (query: GetTripQuery, agencyId: string) => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const where: { agency_id: string; status?: string } = { agency_id: agencyId };
    if (query.status) where.status = query.status;

    const [data, total] = await tripRepo.findAndCount({
        where,
        relations: ['route', 'vehicle', 'driver'],
        order: { departure_time: 'DESC' },
        skip,
        take: limit,
    });

    return {
        data,
        meta: { total, currentPage: page, totalPages: Math.ceil(total / limit) || 1 },
    };
};

export const createTrip = async (createTripDto: CreateTripInput, agencyId: string) => {
    const routeRepo = AppDataSource.getRepository(Route);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const userRepo = AppDataSource.getRepository(User);
    const tripRepo = AppDataSource.getRepository(Trip);

    const route = await routeRepo.findOne({
        where: { id: createTripDto.route_id, agency_id: agencyId },
    });
    if (!route) {
        throw new AppError('Không tìm thấy tuyến đường hoặc tuyến không thuộc nhà xe của bạn.', 404);
    }

    const vehicle = await vehicleRepo.findOne({
        where: { id: createTripDto.vehicle_id, agency_id: agencyId },
    });
    if (!vehicle) {
        throw new AppError('Không tìm thấy phương tiện hoặc xe không thuộc nhà xe của bạn.', 404);
    }
    if (vehicle.status === VehicleStatus.MAINTENANCE) {
        throw new BadRequestException('Xe đang trong trạng thái bảo dưỡng, không thể xếp chuyến.');
    }

    const driver = await userRepo.findOne({
        where: { id: createTripDto.driver_id, agency_id: agencyId },
        relations: ['role'],
    });
    if (!driver || !driver.role) {
        throw new AppError('Không tìm thấy tài xế hoặc tài xế không thuộc nhà xe của bạn.', 404);
    }
    if (driver.role.name !== DRIVER_ROLE_NAME) {
        throw new BadRequestException('Người dùng được chọn không phải tài xế (DRIVER).');
    }

    // validate.middleware chỉ parse Zod, không gán lại req.body → departure_time thường vẫn là chuỗi ISO.
    const rawDeparture = createTripDto.departure_time as unknown;
    const departureTime =
        rawDeparture instanceof Date ? rawDeparture : new Date(rawDeparture as string);
    if (Number.isNaN(departureTime.getTime())) {
        throw new BadRequestException('Thời gian xuất bến không hợp lệ.');
    }
    const plannedEndTime = computePlannedEndTime(departureTime, route.estimated_hours);

    const conflict = await hasTripScheduleConflict(
        agencyId,
        createTripDto.driver_id,
        createTripDto.vehicle_id,
        departureTime,
        plannedEndTime,
    );
    if (conflict) {
        throw new ConflictException(
            'Tài xế hoặc xe đã có lịch trình trùng trong khoảng thời gian này (chuyến đang lên lịch hoặc đang chạy).',
        );
    }

    const trip_code = await generateUniqueTripCode(tripRepo);

    const trip = tripRepo.create({
        agency_id: agencyId,
        trip_code,
        route_id: createTripDto.route_id,
        vehicle_id: createTripDto.vehicle_id,
        driver_id: createTripDto.driver_id,
        departure_time: departureTime,
        planned_end_time: plannedEndTime,
        status: TripStatus.SCHEDULED,
    });

    return await tripRepo.save(trip);
};
