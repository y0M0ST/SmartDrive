import { AppDataSource } from '../../config/data-source';
import { GpsLog } from '../../entities/gps-log.entity';
import { Trip } from '../../entities/trip.entity';
import { AppError } from '../../common/errors/app-error';
import { emitGpsUpdate } from '../../socket/socket.service';
import type { PostGpsInput } from './gps.dto';

/**
 * Nhận tọa độ GPS từ thiết bị AI:
 * 1. Kiểm tra trip tồn tại và đang IN_PROGRESS
 * 2. Lưu vào bảng gps_logs
 * 3. Emit realtime tới admin đang xem bản đồ
 */
export const saveGpsLog = async (dto: PostGpsInput): Promise<GpsLog> => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const gpsLogRepo = AppDataSource.getRepository(GpsLog);

    const trip = await tripRepo.findOne({ where: { id: dto.trip_id } });
    if (!trip) throw new AppError('Chuyến đi không tồn tại.', 404);
    if (trip.status !== 'IN_PROGRESS') {
        throw new AppError('Chuyến đi không đang chạy (cần trạng thái IN_PROGRESS).', 400);
    }

    const log = gpsLogRepo.create({
        trip_id: dto.trip_id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading ?? null,
        recorded_at: dto.recorded_at ? new Date(dto.recorded_at) : new Date(),
    });
    await gpsLogRepo.save(log);

    // Đẩy realtime tới tất cả admin đang join room "trip:{tripId}"
    emitGpsUpdate({
        tripId: dto.trip_id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading ?? null,
        recorded_at: log.recorded_at.toISOString(),
    });

    return log;
};
