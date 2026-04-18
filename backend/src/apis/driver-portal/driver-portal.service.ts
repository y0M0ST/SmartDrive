import { AppDataSource } from '../../config/data-source';
import { Trip } from '../../entities/trip.entity';
import type { GetMyTripsQuery } from './driver-portal.dto';

export type DriverPortalRouteDto = {
    id: string;
    code: string;
    name: string;
    start_point: string;
    end_point: string;
    distance_km: number;
    estimated_hours: number;
    status: string;
};

export type DriverPortalVehicleDto = {
    id: string;
    license_plate: string;
    type: string;
    status: string;
};

export type DriverPortalAgencyDto = {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    address: string | null;
    status: string;
};

export type DriverPortalTripListItem = {
    id: string;
    trip_code: string;
    status: string;
    departure_time: Date;
    planned_end_time: Date;
    actual_start_time: Date | null;
    actual_end_time: Date | null;
    cancel_reason: string | null;
    route: DriverPortalRouteDto;
    vehicle: DriverPortalVehicleDto;
    agency: DriverPortalAgencyDto;
};

const mapTrip = (t: Trip): DriverPortalTripListItem => ({
    id: t.id,
    trip_code: t.trip_code,
    status: t.status,
    departure_time: t.departure_time,
    planned_end_time: t.planned_end_time,
    actual_start_time: t.actual_start_time ?? null,
    actual_end_time: t.actual_end_time ?? null,
    cancel_reason: t.cancel_reason ?? null,
    route: {
        id: t.route.id,
        code: t.route.code,
        name: t.route.name,
        start_point: t.route.start_point,
        end_point: t.route.end_point,
        distance_km: t.route.distance_km,
        estimated_hours: t.route.estimated_hours,
        status: t.route.status,
    },
    vehicle: {
        id: t.vehicle.id,
        license_plate: t.vehicle.license_plate,
        type: t.vehicle.type,
        status: t.vehicle.status,
    },
    agency: {
        id: t.agency.id,
        code: t.agency.code,
        name: t.agency.name,
        phone: t.agency.phone ?? null,
        address: t.agency.address ?? null,
        status: t.agency.status,
    },
});

/**
 * US_15 — Lịch trình của tài xế đang đăng nhập.
 * `driverUserId` phải là `req.user.id` từ JWT (không từ query/body).
 */
const getMyTripsImpl = async (driverUserId: string, query: GetMyTripsQuery) => {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const tripRepo = AppDataSource.getRepository(Trip);

    const [rows, total] = await tripRepo.findAndCount({
        where: { driver_id: driverUserId },
        relations: ['route', 'vehicle', 'agency'],
        order: { departure_time: 'DESC' },
        skip,
        take: limit,
    });

    return {
        data: rows.map(mapTrip),
        meta: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit) || 1,
            limit,
        },
    };
};

export const DriverPortalService = {
    getMyTrips: getMyTripsImpl,
};

export const getMyTrips = DriverPortalService.getMyTrips;
