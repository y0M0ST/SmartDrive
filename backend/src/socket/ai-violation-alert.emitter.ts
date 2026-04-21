import { AppDataSource } from '../config/data-source';
import { AiViolation } from '../entities/ai-violation.entity';
import { emitAiViolationAlertToAgencyRoom, type AiViolationSocketPayload } from './socket-hub';

/**
 * Tải bản ghi + trip/xe/tài xế rồi emit `ai_violation_alert` vào `agency_room:{agency_id}`.
 * Lỗi emit / DB không ném ra ngoài — không làm fail HTTP ingest.
 */
export const emitAiViolationAlertByViolationId = async (violationId: string): Promise<void> => {
    try {
        const repo = AppDataSource.getRepository(AiViolation);
        const row = await repo.findOne({
            where: { id: violationId },
            relations: { trip: { vehicle: true, driver: true } },
        });
        if (!row?.trip?.agency_id) {
            return;
        }
        const plate = row.trip.vehicle?.license_plate ?? '';
        const driverName = row.trip.driver?.full_name ?? '';
        const payload: AiViolationSocketPayload = {
            violation_id: row.id,
            trip_id: row.trip_id,
            trip_code: row.trip.trip_code ?? null,
            violation_type: row.type,
            license_plate: plate,
            driver_name: driverName,
            occurred_at: row.occurred_at.toISOString(),
            image_url: row.image_url,
            latitude: row.latitude ?? null,
            longitude: row.longitude ?? null,
        };
        emitAiViolationAlertToAgencyRoom(row.trip.agency_id, payload);
    } catch (err) {
        console.warn('[Socket.io] emit ai_violation_alert that bai:', err);
    }
};
