import { AppDataSource } from '../../config/data-source';
import { AiViolation } from '../../entities/ai-violation.entity';
import { DriverScore } from '../../entities/driver-score.entity';
import { User } from '../../entities/user.entity';
import { formatYearMonthInVN, vnMonthRangeFromYearMonth } from '../../common/utils/vn-timezone';
import { getActiveViolationPointsToSubtract } from '../device-violations/violation-config-query';
import { AppError } from '../../common/errors/app-error';
import type { LeaderboardQuery } from './driver-score.dto';

const DRIVER_ROLE_NAME = 'DRIVER';

export type LeaderboardEntry = {
    driver_id: string;
    full_name: string;
    evaluation_month: string;
    total_violations: number | null;
    total_deducted_points: number | null;
    final_score: number | null;
};

export type DriverViolationHistoryItem = {
    id: string;
    type: string;
    occurred_at: string;
    image_url: string;
    points_deducted: number;
    trip_id: string;
};

/**
 * US_13 — Sau mỗi vi phạm mới (đã lưu DB): upsert điểm tháng (VN) của tài xế.
 */
export const applyDriverScoreOnNewViolation = async (violationId: string): Promise<void> => {
    try {
        const vioRepo = AppDataSource.getRepository(AiViolation);
        const v = await vioRepo.findOne({
            where: { id: violationId },
            relations: { trip: true },
        });
        if (!v?.trip?.agency_id) {
            return;
        }
        const agencyId = v.trip.agency_id;
        const driverId = v.driver_id;
        const occurred = v.occurred_at instanceof Date ? v.occurred_at : new Date(v.occurred_at);
        const evaluationMonth = formatYearMonthInVN(occurred);
        const points = await getActiveViolationPointsToSubtract(v.type, occurred);

        const dsRepo = AppDataSource.getRepository(DriverScore);
        let row = await dsRepo.findOne({
            where: {
                agency_id: agencyId,
                driver_id: driverId,
                evaluation_month: evaluationMonth,
            },
        });
        if (!row) {
            row = dsRepo.create({
                agency_id: agencyId,
                driver_id: driverId,
                evaluation_month: evaluationMonth,
                total_violations: 0,
                total_deducted_points: 0,
                final_score: 100,
                calculated_at: new Date(),
            });
        }
        row.total_violations += 1;
        row.total_deducted_points += points;
        row.final_score = Math.max(0, 100 - row.total_deducted_points);
        row.calculated_at = new Date();
        await dsRepo.save(row);
    } catch (err) {
        console.warn('[US_13] applyDriverScoreOnNewViolation:', err);
    }
};

const resolveLeaderboardMonth = (q: LeaderboardQuery): string =>
    q.month?.trim() || formatYearMonthInVN(new Date());

export const getLeaderboardForAgency = async (
    agencyId: string,
    query: LeaderboardQuery,
): Promise<{ evaluation_month: string; sort: string; entries: LeaderboardEntry[] }> => {
    const month = resolveLeaderboardMonth(query);
    const sort = query.sort ?? 'desc';

    const userRepo = AppDataSource.getRepository(User);
    const drivers = await userRepo.find({
        where: { agency_id: agencyId },
        relations: { role: true },
        order: { full_name: 'ASC' },
    });
    const eligible = drivers.filter((u) => u.role?.name === DRIVER_ROLE_NAME);

    const dsRepo = AppDataSource.getRepository(DriverScore);
    const scores = await dsRepo.find({
        where: { agency_id: agencyId, evaluation_month: month },
    });
    const scoreMap = new Map(scores.map((s) => [s.driver_id, s]));

    const entries: LeaderboardEntry[] = eligible.map((d) => {
        const s = scoreMap.get(d.id);
        return {
            driver_id: d.id,
            full_name: d.full_name,
            evaluation_month: month,
            total_violations: s ? s.total_violations : null,
            total_deducted_points: s ? s.total_deducted_points : null,
            final_score: s ? s.final_score : null,
        };
    });

    entries.sort((a, b) => {
        const av = a.final_score;
        const bv = b.final_score;
        if (av === null && bv === null) {
            return a.full_name.localeCompare(b.full_name, 'vi');
        }
        if (av === null) {
            return 1;
        }
        if (bv === null) {
            return -1;
        }
        const cmp = sort === 'asc' ? av - bv : bv - av;
        if (cmp !== 0) {
            return cmp;
        }
        return a.full_name.localeCompare(b.full_name, 'vi');
    });

    return { evaluation_month: month, sort, entries };
};

export const getDriverViolationHistory = async (
    driverId: string,
    agencyId: string,
    month: string,
): Promise<{ driver_id: string; evaluation_month: string; violations: DriverViolationHistoryItem[] }> => {
    const userRepo = AppDataSource.getRepository(User);
    const driver = await userRepo.findOne({
        where: { id: driverId, agency_id: agencyId },
        relations: { role: true },
    });
    if (!driver || driver.role?.name !== DRIVER_ROLE_NAME) {
        throw new AppError('Không tìm thấy tài xế hoặc không thuộc nhà xe.', 404);
    }

    const { from, to } = vnMonthRangeFromYearMonth(month);
    const vioRepo = AppDataSource.getRepository(AiViolation);
    const rows = await vioRepo
        .createQueryBuilder('v')
        .innerJoin('v.trip', 't')
        .leftJoinAndSelect('v.config', 'cfg')
        .where('v.driver_id = :driverId', { driverId })
        .andWhere('t.agency_id = :agencyId', { agencyId })
        .andWhere('v.occurred_at >= :from AND v.occurred_at <= :to', { from, to })
        .orderBy('v.occurred_at', 'DESC')
        .getMany();

    const violations: DriverViolationHistoryItem[] = rows.map((v) => ({
        id: v.id,
        type: v.type,
        occurred_at: v.occurred_at.toISOString(),
        image_url: v.image_url,
        points_deducted: v.config?.points_to_subtract ?? 0,
        trip_id: v.trip_id,
    }));

    return { driver_id: driverId, evaluation_month: month, violations };
};
