import { QueryFailedError } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { AiViolation } from '../../entities/ai-violation.entity';
import { Trip } from '../../entities/trip.entity';
import { AppError, BadRequestException } from '../../common/errors/app-error';
import { uploadImageBufferToCloudinary } from '../../utils/cloudinary';
import { emitAiViolationAlertByViolationId } from '../../socket/ai-violation-alert.emitter';
import { applyDriverScoreOnNewViolation } from '../driver-scores/driver-score.service';
import { resolveViolationConfigId } from './violation-config-query';
import { assertTripAcceptsViolationOccurredWindow } from './device-violation-trip-window';
import { deviceViolationMetadataSchema, type DeviceViolationMetadata } from './device-violation.dto';

export type DeviceViolationIngestAck = {
    duplicate: boolean;
    deviceEventId: string;
    violationId: string;
    imageUrl?: string;
};

const parseMetadataJson = (dataJson: string): DeviceViolationMetadata => {
    let raw: unknown;
    try {
        raw = JSON.parse(dataJson) as unknown;
    } catch {
        throw new BadRequestException('Field data không phải JSON hợp lệ.');
    }
    const parsed = deviceViolationMetadataSchema.safeParse(raw);
    if (!parsed.success) {
        throw new BadRequestException('Metadata không đúng định dạng.', parsed.error.flatten());
    }
    return parsed.data;
};

const buildIdempotentAck = async (deviceEventId: string): Promise<DeviceViolationIngestAck> => {
    const violationRepo = AppDataSource.getRepository(AiViolation);
    const existing = await violationRepo.findOne({ where: { device_event_id: deviceEventId } });
    if (!existing) {
        throw new AppError('Không tìm thấy bản ghi vi phạm sau xung đột đồng bộ.', 500);
    }
    return {
        duplicate: true,
        deviceEventId,
        violationId: existing.id,
        imageUrl: existing.image_url,
    };
};

/**
 * US_20 — Ingest vi phạm từ thiết bị (multipart: ảnh + metadata JSON).
 * Thứ tự: parse + idempotent → kiểm tra occurred_at trong khoảng chuyến (IN_PROGRESS/COMPLETED) → upload Cloudinary → lưu DB.
 */
export const ingestDeviceViolation = async (
    imageBuffer: Buffer,
    dataJson: string,
): Promise<{ message: string; data: DeviceViolationIngestAck }> => {
    const meta = parseMetadataJson(dataJson);

    const violationRepo = AppDataSource.getRepository(AiViolation);
    const existed = await violationRepo.findOne({ where: { device_event_id: meta.deviceEventId } });
    if (existed) {
        return {
            message: 'Sự kiện đã được ghi nhận trước đó (ACK idempotent).',
            data: {
                duplicate: true,
                deviceEventId: meta.deviceEventId,
                violationId: existed.id,
                imageUrl: existed.image_url,
            },
        };
    }

    const tripRepo = AppDataSource.getRepository(Trip);
    const trip = await tripRepo.findOne({ where: { id: meta.tripId } });
    if (!trip) {
        throw new AppError('Không tìm thấy chuyến đi.', 404);
    }
    assertTripAcceptsViolationOccurredWindow(trip, meta.occurredAt);

    const imageUrl = await uploadImageBufferToCloudinary(imageBuffer, 'smartdrive/ai-violations');
    const configId = await resolveViolationConfigId(meta.type, meta.occurredAt);
    const now = new Date();

    const row = violationRepo.create({
        trip_id: trip.id,
        driver_id: trip.driver_id,
        vehicle_id: trip.vehicle_id,
        device_id: null,
        config_id: configId,
        device_event_id: meta.deviceEventId,
        type: meta.type,
        image_url: imageUrl,
        latitude: meta.latitude ?? null,
        longitude: meta.longitude ?? null,
        occurred_at: meta.occurredAt,
        sync_status: 'SYNCED',
        synced_at: now,
    });

    try {
        await violationRepo.save(row);
    } catch (err) {
        if (err instanceof QueryFailedError) {
            const code = (err as unknown as { driverError?: { code?: string } }).driverError?.code;
            if (code === '23505') {
                const ack = await buildIdempotentAck(meta.deviceEventId);
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
        message: 'Đã ghi nhận vi phạm AI và đồng bộ thành công.',
        data: {
            duplicate: false,
            deviceEventId: meta.deviceEventId,
            violationId: row.id,
            imageUrl,
        },
    };
};
