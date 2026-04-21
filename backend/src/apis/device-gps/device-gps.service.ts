import { AppDataSource } from '../../config/data-source';
import { GpsLog } from '../../entities/gps-log.entity';
import { Trip } from '../../entities/trip.entity';
import { TripStatus } from '../../common/constants/enums';
import { AppError, BadRequestException } from '../../common/errors/app-error';
import { emitTripGpsUpdateToAgencyRoom } from '../../socket/socket-hub';
import type { DeviceGpsIngestBody } from './device-gps.dto';

export type DeviceGpsIngestResult = {
    gpsLogId: string;
    trip_id: string;
    recorded_at: string;
};

export const ingestDeviceGps = async (body: DeviceGpsIngestBody): Promise<DeviceGpsIngestResult> => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const trip = await tripRepo.findOne({ where: { id: body.trip_id } });
    if (!trip) {
        throw new AppError('Không tìm thấy chuyến đi.', 404);
    }
    if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException(
            `Chuyến đi không ở trạng thái IN_PROGRESS (hiện tại: ${trip.status}). Không ghi nhận GPS.`,
        );
    }

    const recordedAt = new Date();
    const gpsRepo = AppDataSource.getRepository(GpsLog);
    const row = gpsRepo.create({
        trip_id: trip.id,
        latitude: body.latitude,
        longitude: body.longitude,
        speed: body.speed,
        heading: body.heading ?? null,
        recorded_at: recordedAt,
    });
    const saved = await gpsRepo.save(row);

    const payload = {
        trip_id: saved.trip_id,
        agency_id: trip.agency_id,
        latitude: saved.latitude,
        longitude: saved.longitude,
        speed: saved.speed,
        heading: saved.heading,
        recorded_at: saved.recorded_at.toISOString(),
    };
    emitTripGpsUpdateToAgencyRoom(trip.agency_id, payload);

    return {
        gpsLogId: saved.id,
        trip_id: saved.trip_id,
        recorded_at: saved.recorded_at.toISOString(),
    };
};
