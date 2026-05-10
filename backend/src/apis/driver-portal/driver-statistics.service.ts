import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { Trip } from '../../entities/trip.entity';
import { AiViolation } from '../../entities/ai-violation.entity';
import { DriverScore } from '../../entities/driver-score.entity';
import { SalaryConfig } from '../../entities/salary-config.entity';
import { TripStatus } from '../../common/constants/enums';
import {
    enumerateVNDateStringsInclusive,
    formatDateInVN,
    formatYearMonthInVN,
    vnDayEndIsoDate,
    vnDayStartIsoDate,
    vnMonthRangeFromYearMonth,
} from '../../common/utils/vn-timezone';

const DRIVER_ROLE = 'DRIVER';

export type MonthWeekSlice = {
    week_index: number;
    label: string;
    from: string;
    to: string;
};

/** Chia tháng `YYYY-MM` (VN) thành các “tuần” 7 ngày liên tiếp từ ngày 1 (tuần cuối có thể < 7 ngày). */
export function splitMonthIntoWeekSlicesVN(ym: string): MonthWeekSlice[] {
    const { from: mFrom, to: mTo } = vnMonthRangeFromYearMonth(ym);
    const startYmd = formatDateInVN(mFrom);
    const endYmd = formatDateInVN(mTo);
    const days = enumerateVNDateStringsInclusive(startYmd, endYmd);
    const slices: MonthWeekSlice[] = [];
    for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        slices.push({
            week_index: slices.length + 1,
            label: `${first} – ${last}`,
            from: first,
            to: last,
        });
    }
    return slices;
}

function distributeBaseSalaryAcrossWeeks(baseSalary: number, weekCount: number): number[] {
    if (weekCount <= 0) {
        return [];
    }
    const floorPart = Math.floor(baseSalary / weekCount);
    const parts = Array.from({ length: weekCount }, () => floorPart);
    const remainder = baseSalary - floorPart * weekCount;
    if (remainder !== 0) {
        parts[weekCount - 1] += remainder;
    }
    return parts;
}

async function countCompletedTripsInRange(driverId: string, from: Date, to: Date): Promise<number> {
    const tripRepo = AppDataSource.getRepository(Trip);
    const raw = await tripRepo
        .createQueryBuilder('t')
        .select('COUNT(*)', 'cnt')
        .where('t.driver_id = :driverId', { driverId })
        .andWhere('t.status = :st', { st: TripStatus.COMPLETED })
        .andWhere('t.actual_end_time IS NOT NULL')
        .andWhere('t.actual_end_time BETWEEN :from AND :to', { from, to })
        .getRawOne<{ cnt: string }>();
    return Number(raw?.cnt ?? 0);
}

async function sumDeductedPointsInRange(driverId: string, from: Date, to: Date): Promise<number> {
    const vioRepo = AppDataSource.getRepository(AiViolation);
    const raw = await vioRepo
        .createQueryBuilder('v')
        .select('COALESCE(SUM(COALESCE(cfg.points_to_subtract, 0)), 0)', 's')
        .innerJoin('v.trip', 't')
        .leftJoin('v.config', 'cfg')
        .where('v.driver_id = :driverId', { driverId })
        .andWhere('t.driver_id = :driverId', { driverId })
        .andWhere('v.occurred_at BETWEEN :from AND :to', { from, to })
        .getRawOne<{ s: string }>();
    return Number(raw?.s ?? 0);
}

/** Đếm vi phạm theo loại trong khoảng (US_17 — hiển thị buồn ngủ / mất tập trung). */
async function countViolationsByTypeInRange(
    driverId: string,
    from: Date,
    to: Date,
): Promise<{ drowsy: number; distracted: number }> {
    const vioRepo = AppDataSource.getRepository(AiViolation);
    const rows = await vioRepo
        .createQueryBuilder('v')
        .select('v.type', 'type')
        .addSelect('COUNT(*)', 'cnt')
        .innerJoin('v.trip', 't')
        .where('v.driver_id = :driverId', { driverId })
        .andWhere('t.driver_id = :driverId', { driverId })
        .andWhere('v.occurred_at BETWEEN :from AND :to', { from, to })
        .groupBy('v.type')
        .getRawMany<{ type: string; cnt: string }>();
    let drowsy = 0;
    let distracted = 0;
    for (const r of rows) {
        const n = Number(r.cnt ?? 0);
        if (r.type === 'DROWSY') {
            drowsy = n;
        }
        if (r.type === 'DISTRACTED') {
            distracted = n;
        }
    }
    return { drowsy, distracted };
}

/**
 * US_17 — Thống kê điểm an toàn & thu nhập dự kiến (chỉ dữ liệu của `driverUserId`).
 */
export async function getDriverMonthlyStatistics(driverUserId: string, evaluationMonth: string) {
    const userRepo = AppDataSource.getRepository(User);
    const salaryRepo = AppDataSource.getRepository(SalaryConfig);
    const scoreRepo = AppDataSource.getRepository(DriverScore);

    const user = await userRepo.findOne({
        where: { id: driverUserId },
        relations: { role: true },
    });

    if (!user || user.role?.name !== DRIVER_ROLE) {
        return buildEmptyPayload(evaluationMonth, false);
    }

    const agencyId = user.agency_id;
    if (!agencyId) {
        return buildEmptyPayload(evaluationMonth, false);
    }

    const { from: monthFrom, to: monthTo } = vnMonthRangeFromYearMonth(evaluationMonth);

    const salary = await salaryRepo.findOne({ where: { agency_id: agencyId } });
    const salaryConfigured = !!salary;

    const scoreRow = await scoreRepo.findOne({
        where: {
            driver_id: driverUserId,
            agency_id: agencyId,
            evaluation_month: evaluationMonth,
        },
    });

    const completedTripsMonth = await countCompletedTripsInRange(driverUserId, monthFrom, monthTo);
    const deductedFromViolationsMonth = await sumDeductedPointsInRange(
        driverUserId,
        monthFrom,
        monthTo,
    );
    const { drowsy: vDrowsy, distracted: vDistracted } = await countViolationsByTypeInRange(
        driverUserId,
        monthFrom,
        monthTo,
    );
    const violationsSumAi = vDrowsy + vDistracted;

    const totalDeductedPoints =
        scoreRow != null ? scoreRow.total_deducted_points : deductedFromViolationsMonth;
    const finalSafetyScore = scoreRow != null ? scoreRow.final_score : null;
    const totalViolationsDisplay = scoreRow != null ? scoreRow.total_violations : violationsSumAi;

    const base = salary?.base_salary ?? 0;
    const bonus = salary?.bonus_per_trip ?? 0;
    const penalty = salary?.penalty_per_point ?? 0;

    const monthlyEstimatedIncomeVnd = salaryConfigured
        ? Math.max(0, base + completedTripsMonth * bonus - totalDeductedPoints * penalty)
        : 0;

    const weekSlices = splitMonthIntoWeekSlicesVN(evaluationMonth);
    const baseParts = salaryConfigured ? distributeBaseSalaryAcrossWeeks(base, weekSlices.length) : [];

    const safety_score_by_week = [];
    const estimated_income_by_week = [];

    for (let i = 0; i < weekSlices.length; i += 1) {
        const w = weekSlices[i];
        const wFrom = vnDayStartIsoDate(w.from);
        const wTo = vnDayEndIsoDate(w.to);
        const tripsW = await countCompletedTripsInRange(driverUserId, wFrom, wTo);
        const ptsW = await sumDeductedPointsInRange(driverUserId, wFrom, wTo);
        const scoreW = Math.max(0, 100 - ptsW);
        safety_score_by_week.push({
            week_index: w.week_index,
            label: w.label,
            score: scoreW,
            deducted_points: ptsW,
            trips_completed: tripsW,
        });

        const baseSlice = salaryConfigured ? (baseParts[i] ?? 0) : 0;
        const incomeW =
            salaryConfigured
                ? Math.max(0, baseSlice + tripsW * bonus - ptsW * penalty)
                : 0;
        estimated_income_by_week.push({
            week_index: w.week_index,
            label: w.label,
            estimated_income_vnd: incomeW,
            trips_completed: tripsW,
            deducted_points: ptsW,
            base_salary_portion_vnd: salaryConfigured ? baseSlice : 0,
        });
    }

    return {
        cards: {
            evaluation_month: evaluationMonth,
            salary_configured: salaryConfigured,
            base_salary_vnd: salary ? salary.base_salary : null,
            bonus_per_trip_vnd: salary ? salary.bonus_per_trip : null,
            penalty_per_point_vnd: salary ? salary.penalty_per_point : null,
            completed_trips: completedTripsMonth,
            total_deducted_points: totalDeductedPoints,
            violations_drowsy_in_month: vDrowsy,
            violations_distracted_in_month: vDistracted,
            /** Ưu tiên `driver_scores`; nếu chưa có bản ghi tháng thì lấy tổng sự kiện AI trong tháng. */
            total_violations_in_month: totalViolationsDisplay,
            final_safety_score: finalSafetyScore,
            monthly_estimated_income_vnd: monthlyEstimatedIncomeVnd,
        },
        charts: {
            safety_score_by_week,
            estimated_income_by_week,
        },
    };
}

function buildEmptyPayload(evaluationMonth: string, salaryConfigured: boolean) {
    const weeks = splitMonthIntoWeekSlicesVN(evaluationMonth);
    return {
        cards: {
            evaluation_month: evaluationMonth,
            salary_configured: salaryConfigured,
            base_salary_vnd: null,
            bonus_per_trip_vnd: null,
            penalty_per_point_vnd: null,
            completed_trips: 0,
            total_deducted_points: 0,
            violations_drowsy_in_month: 0,
            violations_distracted_in_month: 0,
            total_violations_in_month: 0,
            final_safety_score: null,
            monthly_estimated_income_vnd: 0,
        },
        charts: {
            safety_score_by_week: weeks.map((w) => ({
                week_index: w.week_index,
                label: w.label,
                score: 100,
                deducted_points: 0,
                trips_completed: 0,
            })),
            estimated_income_by_week: weeks.map((w) => ({
                week_index: w.week_index,
                label: w.label,
                estimated_income_vnd: 0,
                trips_completed: 0,
                deducted_points: 0,
                base_salary_portion_vnd: 0,
            })),
        },
    };
}

/** Tháng mặc định: lịch VN tại `now`. */
export function defaultEvaluationMonth(now = new Date()): string {
    return formatYearMonthInVN(now);
}
