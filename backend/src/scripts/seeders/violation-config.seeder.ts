import { AppDataSource } from '../../config/data-source';
import { ViolationConfig } from '../../entities/violation-config.entity';
import { ViolationType } from '../../common/constants/enums';

const DEFAULT_CONFIGS: { type: string; points: number }[] = [
    { type: ViolationType.DROWSY, points: 15 },
    { type: ViolationType.DISTRACTED, points: 10 },
];

/**
 * US_13 — Cấu hình điểm trừ theo loại vi phạm (đọc từ DB khi tính điểm).
 */
export async function seedViolationConfigs(): Promise<void> {
    const repo = AppDataSource.getRepository(ViolationConfig);
    const now = new Date();

    for (const def of DEFAULT_CONFIGS) {
        const existing = await repo.findOne({
            where: { type: def.type, is_active: true },
            order: { effective_from: 'DESC' },
        });
        if (existing) {
            existing.points_to_subtract = def.points;
            existing.is_active = true;
            await repo.save(existing);
            continue;
        }
        const row = repo.create({
            type: def.type,
            points_to_subtract: def.points,
            effective_from: now,
            effective_to: null,
            is_active: true,
        });
        await repo.save(row);
    }
}
