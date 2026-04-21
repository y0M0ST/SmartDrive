import { AppDataSource } from '../../config/data-source';
import { ViolationConfig } from '../../entities/violation-config.entity';

const activeConfigQb = (type: string, occurredAt: Date) =>
    AppDataSource.getRepository(ViolationConfig)
        .createQueryBuilder('c')
        .where('c.type = :type', { type })
        .andWhere('c.is_active = :active', { active: true })
        .andWhere('c.effective_from <= :at', { at: occurredAt })
        .andWhere('(c.effective_to IS NULL OR c.effective_to >= :at)', { at: occurredAt })
        .orderBy('c.effective_from', 'DESC');

export const resolveViolationConfigId = async (type: string, occurredAt: Date): Promise<string | null> => {
    const row = await activeConfigQb(type, occurredAt).getOne();
    return row?.id ?? null;
};

/** Điểm trừ đang hiệu lực tại `occurredAt` (0 nếu không có config). */
export const getActiveViolationPointsToSubtract = async (
    type: string,
    occurredAt: Date,
): Promise<number> => {
    const row = await activeConfigQb(type, occurredAt).getOne();
    const p = row?.points_to_subtract;
    if (p === undefined || p === null) {
        return 0;
    }
    return Math.max(0, Number(p));
};
