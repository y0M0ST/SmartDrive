import { AppDataSource } from '../../config/data-source';
import { Trip } from '../../entities/trip.entity';
import { GpsLog } from '../../entities/gps-log.entity';
import { AiViolation } from '../../entities/ai-violation.entity';
import { TripStatus } from '../../common/constants/enums';

export type ActiveTripTrackingRow = {
    trip_id: string;
    trip_code: string;
    license_plate: string;
    driver_name: string;
    violation_count: number;
    latitude: number | null;
    longitude: number | null;
    speed: number | null;
    heading: number | null;
    /** Thời điểm điểm GPS mới nhất (ISO 8601); null nếu chưa có log — FE dùng để phát hiện mất tín hiệu > 3 phút */
    last_signal_time: string | null;
};

const loadLatestGpsByTripIds = async (tripIds: string[]): Promise<Map<string, GpsLog>> => {
    const map = new Map<string, GpsLog>();
    if (tripIds.length === 0) {
        return map;
    }
    const repo = AppDataSource.getRepository(GpsLog);
    const rows = await repo
        .createQueryBuilder('g')
        .distinctOn(['g.trip_id'])
        .where('g.trip_id IN (:...ids)', { ids: tripIds })
        .orderBy('g.trip_id', 'ASC')
        .addOrderBy('g.recorded_at', 'DESC')
        .getMany();
    for (const r of rows) {
        map.set(r.trip_id, r);
    }
    return map;
};

const loadViolationCounts = async (tripIds: string[]): Promise<Map<string, number>> => {
    const map = new Map<string, number>();
    if (tripIds.length === 0) {
        return map;
    }
    const repo = AppDataSource.getRepository(AiViolation);
    const raw = await repo
        .createQueryBuilder('av')
        .select('av.trip_id', 'trip_id')
        .addSelect('COUNT(av.id)', 'cnt')
        .where('av.trip_id IN (:...ids)', { ids: tripIds })
        .groupBy('av.trip_id')
        .getRawMany<{ trip_id: string; cnt: string }>();
    for (const row of raw) {
        map.set(row.trip_id, Number(row.cnt));
    }
    return map;
};

/**
 * Danh sách chuyến IN_PROGRESS thuộc đúng một agency — không nhận agency_id từ client.
 */
export const listActiveTripsWithLatestGps = async (agencyId: string): Promise<ActiveTripTrackingRow[]> => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const trips = await tripRepo.find({
        where: { agency_id: agencyId, status: TripStatus.IN_PROGRESS },
        relations: { vehicle: true, driver: true },
        order: { departure_time: 'DESC' },
    });

    const tripIds = trips.map((t) => t.id);
    const [gpsMap, violationMap] = await Promise.all([
        loadLatestGpsByTripIds(tripIds),
        loadViolationCounts(tripIds),
    ]);

    return trips.map((t) => {
        const g = gpsMap.get(t.id);
        const vehiclePlate = t.vehicle?.license_plate ?? '';
        const driverName = t.driver?.full_name ?? '';
        return {
            trip_id: t.id,
            trip_code: t.trip_code,
            license_plate: vehiclePlate,
            driver_name: driverName,
            violation_count: violationMap.get(t.id) ?? 0,
            latitude: g?.latitude ?? null,
            longitude: g?.longitude ?? null,
            speed: g?.speed ?? null,
            heading: g?.heading ?? null,
            last_signal_time: g?.recorded_at ? g.recorded_at.toISOString() : null,
        };
    });
};
