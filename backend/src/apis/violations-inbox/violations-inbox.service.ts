import { AppDataSource } from '../../config/data-source';
import { AiViolation } from '../../entities/ai-violation.entity';
import { AppError } from '../../common/errors/app-error';
import type { ViolationsUnreadQuery } from './violations-inbox.dto';

export type ViolationUnreadItem = {
    id: string;
    trip_id: string;
    type: string;
    occurred_at: string;
    image_url: string;
    latitude: number | null;
    longitude: number | null;
    trip_code: string | null;
};

export const getUnreadForAgency = async (
    agencyId: string,
    query: ViolationsUnreadQuery,
): Promise<{ unread_count: number; items: ViolationUnreadItem[] }> => {
    const repo = AppDataSource.getRepository(AiViolation);

    const where = {
        is_read: false,
        trip: { agency_id: agencyId },
    } as const;

    const [items, unreadCount] = await Promise.all([
        repo.find({
            where,
            relations: { trip: true },
            order: { occurred_at: 'DESC' },
            take: query.limit,
        }),
        repo.count({ where }),
    ]);

    const mapped: ViolationUnreadItem[] = items.map((v) => ({
        id: v.id,
        trip_id: v.trip_id,
        type: v.type,
        occurred_at: v.occurred_at.toISOString(),
        image_url: v.image_url,
        latitude: v.latitude ?? null,
        longitude: v.longitude ?? null,
        trip_code: v.trip?.trip_code ?? null,
    }));

    return { unread_count: unreadCount, items: mapped };
};

export const acknowledgeViolationForAgency = async (
    violationId: string,
    agencyId: string,
    userId: string,
): Promise<void> => {
    const repo = AppDataSource.getRepository(AiViolation);
    const row = await repo.findOne({
        where: { id: violationId, trip: { agency_id: agencyId } },
        relations: { trip: true },
    });
    if (!row) {
        throw new AppError('Không tìm thấy vi phạm hoặc không thuộc nhà xe của bạn.', 404);
    }
    row.is_read = true;
    row.acknowledged_by = userId;
    row.acknowledged_at = new Date();
    await repo.save(row);
};
