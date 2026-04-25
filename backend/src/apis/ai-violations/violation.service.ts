import { SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { AiViolation } from '../../entities/ai-violation.entity';
import type { GetAgencyViolationsQuery } from './violation.dto';
import { vnDayEndIsoDate, vnDayStartIsoDate, vnTodayRange } from '../../common/utils/vn-timezone';

export type AgencyViolationListItem = {
    id: string;
    trip_id: string;
    type: string;
    image_url: string;
    latitude: number | null;
    longitude: number | null;
    occurred_at: Date;
    is_read: boolean;
    trip: {
        id: string | null;
        trip_code: string | null;
        route: {
            code: string | null;
            name: string | null;
            start_point: string | null;
            end_point: string | null;
        } | null;
        vehicle: {
            id: string | null;
            license_plate: string | null;
        } | null;
        driver: {
            id: string | null;
            full_name: string | null;
        } | null;
    };
};

type ViolationRawRow = {
    violation_id: string;
    violation_trip_id: string;
    violation_type: string;
    violation_image_url: string;
    violation_latitude: string | number | null;
    violation_longitude: string | number | null;
    violation_occurred_at: Date;
    violation_is_read: boolean;
    trip_id: string | null;
    trip_code: string | null;
    route_code: string | null;
    route_name: string | null;
    route_start_point: string | null;
    route_end_point: string | null;
    vehicle_id: string | null;
    vehicle_license_plate: string | null;
    driver_id: string | null;
    driver_full_name: string | null;
};

const toNumOrNull = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
};

const mapRawToItem = (r: ViolationRawRow): AgencyViolationListItem => ({
    id: r.violation_id,
    trip_id: r.violation_trip_id,
    type: r.violation_type,
    image_url: r.violation_image_url,
    latitude: toNumOrNull(r.violation_latitude),
    longitude: toNumOrNull(r.violation_longitude),
    occurred_at: r.violation_occurred_at,
    is_read: Boolean(r.violation_is_read),
    trip: {
        id: r.trip_id,
        trip_code: r.trip_code,
        route:
            r.route_code != null ||
            r.route_name != null ||
            r.route_start_point != null ||
            r.route_end_point != null
                ? {
                      code: r.route_code,
                      name: r.route_name,
                      start_point: r.route_start_point,
                      end_point: r.route_end_point,
                  }
                : null,
        vehicle:
            r.vehicle_id !== null || r.vehicle_license_plate !== null
                ? { id: r.vehicle_id, license_plate: r.vehicle_license_plate }
                : null,
        driver:
            r.driver_id !== null || r.driver_full_name !== null
                ? { id: r.driver_id, full_name: r.driver_full_name }
                : null,
    },
});

const applyViolationFilters = (
    qb: SelectQueryBuilder<AiViolation>,
    from: Date,
    to: Date,
    filters: Pick<GetAgencyViolationsQuery, 'driverId' | 'vehicleId' | 'type' | 'isRead'>,
) => {
    qb.andWhere('v.occurred_at >= :from AND v.occurred_at <= :to', { from, to });
    const { driverId, vehicleId, type, isRead } = filters;
    if (driverId) qb.andWhere('v.driver_id = :driverId', { driverId });
    if (vehicleId) qb.andWhere('v.vehicle_id = :vehicleId', { vehicleId });
    if (type) qb.andWhere('v.type = :type', { type });
    if (isRead !== undefined) qb.andWhere('v.is_read = :isRead', { isRead });
};

/**
 * Danh sách vi phạm AI theo nhà xe (US_12).
 * Bảo mật: chỉ các `trip_id` thuộc `agencyId` (kể cả trip soft-delete).
 * Join: `trips`, `routes`, `users`, `vehicles` dạng LEFT JOIN bảng thô — không áp soft-delete ẩn của TypeORM.
 */
const getAgencyViolationsImpl = async (filters: GetAgencyViolationsQuery, agencyId: string) => {
    const { page, limit, startDate, endDate, driverId, vehicleId, type, isRead } = filters;

    const { from, to } =
        startDate && endDate
            ? { from: vnDayStartIsoDate(startDate), to: vnDayEndIsoDate(endDate) }
            : vnTodayRange();

    const skip = (page - 1) * limit;

    const repo = AppDataSource.getRepository(AiViolation);

    const countQb = repo
        .createQueryBuilder('v')
        .where(
            'EXISTS (SELECT 1 FROM trips t_scope WHERE t_scope.id = v.trip_id AND t_scope.agency_id = :agencyId)',
            { agencyId },
        );
    applyViolationFilters(countQb, from, to, { driverId, vehicleId, type, isRead });
    const total = await countQb.getCount();

    const dataQb = repo
        .createQueryBuilder('v')
        .where(
            'EXISTS (SELECT 1 FROM trips t_scope WHERE t_scope.id = v.trip_id AND t_scope.agency_id = :agencyId)',
            { agencyId },
        )
        .leftJoin('trips', 'trip', 'trip.id = v.trip_id')
        .leftJoin('routes', 'route', 'route.id = trip.route_id')
        .leftJoin('users', 'driver', 'driver.id = trip.driver_id')
        .leftJoin('vehicles', 'vehicle', 'vehicle.id = trip.vehicle_id')
        .select('v.id', 'violation_id')
        .addSelect('v.trip_id', 'violation_trip_id')
        .addSelect('v.type', 'violation_type')
        .addSelect('v.image_url', 'violation_image_url')
        .addSelect('v.latitude', 'violation_latitude')
        .addSelect('v.longitude', 'violation_longitude')
        .addSelect('v.occurred_at', 'violation_occurred_at')
        .addSelect('v.is_read', 'violation_is_read')
        .addSelect('trip.id', 'trip_id')
        .addSelect('trip.trip_code', 'trip_code')
        .addSelect('route.code', 'route_code')
        .addSelect('route.name', 'route_name')
        .addSelect('route.start_point', 'route_start_point')
        .addSelect('route.end_point', 'route_end_point')
        .addSelect('vehicle.id', 'vehicle_id')
        .addSelect('vehicle.license_plate', 'vehicle_license_plate')
        .addSelect('driver.id', 'driver_id')
        .addSelect('driver.full_name', 'driver_full_name')
        .orderBy('v.occurred_at', 'DESC')
        .skip(skip)
        .take(limit);

    applyViolationFilters(dataQb, from, to, { driverId, vehicleId, type, isRead });

    const rawRows = (await dataQb.getRawMany()) as ViolationRawRow[];

    return {
        data: rawRows.map(mapRawToItem),
        meta: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit) || 1,
            limit,
            range: { from, to },
        },
    };
};

/** Service layer US_12 — QueryBuilder + LEFT JOIN bảng thô (kèm múi giờ VN). */
export const ViolationService = {
    getAgencyViolations: getAgencyViolationsImpl,
};

export const getAgencyViolations = ViolationService.getAgencyViolations;
