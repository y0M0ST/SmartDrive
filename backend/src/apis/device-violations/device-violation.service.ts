import { QueryFailedError } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { AiViolation } from '../../entities/ai-violation.entity';
import { Trip } from '../../entities/trip.entity';
import { ViolationConfig } from '../../entities/violation-config.entity';
import { TripStatus } from '../../common/constants/enums';
import { AppError, BadRequestException } from '../../common/errors/app-error';
import { uploadImageBufferToCloudinary } from '../../utils/cloudinary';
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

const resolveViolationConfigId = async (type: string, occurredAt: Date): Promise<string | null> => {
    const repo = AppDataSource.getRepository(ViolationConfig);
    const row = await repo
        .createQueryBuilder('c')
        .where('c.type = :type', { type })
        .andWhere('c.is_active = :active', { active: true })
        .andWhere('c.effective_from <= :at', { at: occurredAt })
        .andWhere('(c.effective_to IS NULL OR c.effective_to >= :at)', { at: occurredAt })
        .orderBy('c.effective_from', 'DESC')
        .getOne();
    return row?.id ?? null;
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
 * Thứ tự: parse + idempotent → kiểm tra trip IN_PROGRESS → upload Cloudinary → lưu DB.
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
    if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException(
            `Chuyến đi không ở trạng thái IN_PROGRESS (hiện tại: ${trip.status}). Không ghi nhận vi phạm.`,
        );
    }

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
