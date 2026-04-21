import { QueryFailedError } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { AiViolation } from '../../entities/ai-violation.entity';
import { Trip } from '../../entities/trip.entity';
import { TripStatus } from '../../common/constants/enums';
import { AppError, BadRequestException } from '../../common/errors/app-error';
import { uploadImageBufferToCloudinary } from '../../utils/cloudinary';
import { emitAiViolationAlertByViolationId } from '../../socket/ai-violation-alert.emitter';
import { resolveViolationConfigId } from './violation-config-query';
import { applyDriverScoreOnNewViolation } from '../driver-scores/driver-score.service';
import type { DeviceViolationJsonBody } from './device-violation-json.dto';

export type DeviceViolationJsonAck = {
    duplicate: boolean;
    device_event_id: string;
    violation_id: string;
    image_url?: string;
};

const buildIdempotentAck = async (deviceEventId: string): Promise<DeviceViolationJsonAck> => {
    const violationRepo = AppDataSource.getRepository(AiViolation);
    const existing = await violationRepo.findOne({ where: { device_event_id: deviceEventId } });
    if (!existing) {
        throw new AppError('Không tìm thấy bản ghi vi phạm sau xung đột đồng bộ.', 500);
    }
    return {
        duplicate: true,
        device_event_id: deviceEventId,
        violation_id: existing.id,
        image_url: existing.image_url,
    };
};

const decodeBase64ToBuffer = (raw: string): Buffer => {
    const trimmed = raw.trim();
    const dataUrl = /^data:image\/[\w+.-]+;base64,(.+)$/i.exec(trimmed);
    const b64 = dataUrl ? dataUrl[1] : trimmed;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 32) {
        throw new BadRequestException('image_base64 không hợp lệ hoặc quá ngắn.');
    }
    return buf;
};

const resolveImageUrlFromBody = async (body: DeviceViolationJsonBody): Promise<string> => {
    if (body.image_url?.trim()) {
        return body.image_url.trim();
    }
    if (body.image_base64?.trim()) {
        const buf = decodeBase64ToBuffer(body.image_base64);
        return uploadImageBufferToCloudinary(buf, 'smartdrive/ai-violations');
    }
    throw new BadRequestException('Thiếu image_url hoặc image_base64.');
};

/**
 * US_10 — Ingest JSON + idempotency + emit `ai_violation_alert` vào agency room.
 */
export const ingestDeviceViolationJson = async (
    body: DeviceViolationJsonBody,
): Promise<{ message: string; data: DeviceViolationJsonAck }> => {
    const violationRepo = AppDataSource.getRepository(AiViolation);
    const existed = await violationRepo.findOne({ where: { device_event_id: body.device_event_id } });
    if (existed) {
        return {
            message: 'Sự kiện đã được ghi nhận trước đó (ACK idempotent).',
            data: {
                duplicate: true,
                device_event_id: body.device_event_id,
                violation_id: existed.id,
                image_url: existed.image_url,
            },
        };
    }

    const tripRepo = AppDataSource.getRepository(Trip);
    const trip = await tripRepo.findOne({ where: { id: body.trip_id } });
    if (!trip) {
        throw new AppError('Không tìm thấy chuyến đi.', 404);
    }
    if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException(
            `Chuyến đi không ở trạng thái IN_PROGRESS (hiện tại: ${trip.status}). Không ghi nhận vi phạm.`,
        );
    }

    const occurredAt = body.occurred_at ?? new Date();
    const imageUrl = await resolveImageUrlFromBody(body);
    const configId = await resolveViolationConfigId(body.violation_type, occurredAt);
    const now = new Date();

    const row = violationRepo.create({
        trip_id: trip.id,
        driver_id: trip.driver_id,
        vehicle_id: trip.vehicle_id,
        device_id: null,
        config_id: configId,
        device_event_id: body.device_event_id,
        type: body.violation_type,
        image_url: imageUrl,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        occurred_at: occurredAt,
        sync_status: 'SYNCED',
        synced_at: now,
    });

    try {
        await violationRepo.save(row);
    } catch (err) {
        if (err instanceof QueryFailedError) {
            const code = (err as unknown as { driverError?: { code?: string } }).driverError?.code;
            if (code === '23505') {
                const ack = await buildIdempotentAck(body.device_event_id);
                return {
                    message: 'Sự kiện đã được ghi nhận trước đó (ACK idempotent).',
                    data: ack,
                };
            }
        }
        throw err;
    }

    await emitAiViolationAlertByViolationId(row.id);
    await applyDriverScoreOnNewViolation(row.id);

    return {
        message: 'Đã ghi nhận vi phạm AI (JSON) và phát realtime.',
        data: {
            duplicate: false,
            device_event_id: body.device_event_id,
            violation_id: row.id,
            image_url: imageUrl,
        },
    };
};
