import { EntityManager, In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Trip } from '../../entities/trip.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { TripStatus, VehicleStatus } from '../../common/constants/enums';
import { AppError } from '../../common/errors/app-error';

/** Chuyến đang gán xe — chặn xóa / sửa biển số / đổi MAINTENANCE|INACTIVE */
export const ACTIVE_VEHICLE_TRIP_STATUSES = [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] as const;

export const findActiveTripsForVehicle = async (
    agencyId: string,
    vehicleId: string,
    excludeTripId?: string,
    manager?: EntityManager,
): Promise<Trip[]> => {
    const tripRepo = manager ? manager.getRepository(Trip) : AppDataSource.getRepository(Trip);
    const trips = await tripRepo.find({
        where: {
            agency_id: agencyId,
            vehicle_id: vehicleId,
            status: In([...ACTIVE_VEHICLE_TRIP_STATUSES]),
        },
        order: { departure_time: 'ASC' },
    });
    if (!excludeTripId) return trips;
    return trips.filter((t) => t.id !== excludeTripId);
};

export const assertVehicleHasNoActiveTrips = async (
    agencyId: string,
    vehicleId: string,
    actionLabel: string,
): Promise<void> => {
    const trips = await findActiveTripsForVehicle(agencyId, vehicleId);
    if (trips.length === 0) return;
    const code = trips[0].trip_code;
    throw new AppError(
        `Xe đang được gán cho chuyến ${code} (${trips[0].status}). ${actionLabel}`,
        400,
    );
};

/**
 * Đồng bộ vehicles.status theo chuyến:
 * - Có chuyến IN_PROGRESS → IN_SERVICE
 * - Không còn IN_PROGRESS nhưng đang IN_SERVICE → AVAILABLE (giữ MAINTENANCE/INACTIVE)
 */
export const syncVehicleStatusFromActiveTrips = async (
    agencyId: string,
    vehicleId: string,
    manager?: EntityManager,
): Promise<void> => {
    const vehicleRepo = manager ? manager.getRepository(Vehicle) : AppDataSource.getRepository(Vehicle);
    const tripRepo = manager ? manager.getRepository(Trip) : AppDataSource.getRepository(Trip);

    const vehicle = await vehicleRepo.findOne({ where: { id: vehicleId, agency_id: agencyId } });
    if (!vehicle) return;

    const inProgressCount = await tripRepo.count({
        where: {
            agency_id: agencyId,
            vehicle_id: vehicleId,
            status: TripStatus.IN_PROGRESS,
        },
    });

    if (inProgressCount > 0) {
        if (vehicle.status !== VehicleStatus.IN_SERVICE) {
            vehicle.status = VehicleStatus.IN_SERVICE;
            await vehicleRepo.save(vehicle);
        }
        return;
    }

    if (vehicle.status === VehicleStatus.IN_SERVICE) {
        vehicle.status = VehicleStatus.AVAILABLE;
        await vehicleRepo.save(vehicle);
    }
};

/** Gọi sau mỗi lần đổi trips.status (check-in, hoàn thành, hủy chuyến, …) */
export const notifyTripStatusChanged = async (
    agencyId: string,
    vehicleId: string,
    manager?: EntityManager,
): Promise<void> => {
    await syncVehicleStatusFromActiveTrips(agencyId, vehicleId, manager);
};
