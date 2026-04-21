import { SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Trip } from '../../entities/trip.entity';
import { AiViolation } from '../../entities/ai-violation.entity';
import { User } from '../../entities/user.entity';
import { DriverScore } from '../../entities/driver-score.entity';
import { TripStatus, ViolationType } from '../../common/constants/enums';
import {
    enumerateVNDateStringsInclusive,
    formatYearMonthInVN,
    vnDayEndIsoDate,
    vnDayStartIsoDate,
} from '../../common/utils/vn-timezone';
import { BadRequestException } from '../../common/errors/app-error';
import ExcelJS from 'exceljs';

export type AgencyReportQueryInput = {
    startDate: string;
    endDate: string;
    driverId?: string;
    violationType?: ViolationType;
};

type ReportRange = { from: Date; to: Date; startDateYmd: string; endDateYmd: string };

function parseRange(q: AgencyReportQueryInput): ReportRange {
    const from = vnDayStartIsoDate(q.startDate);
    const to = vnDayEndIsoDate(q.endDate);
    return { from, to, startDateYmd: q.startDate, endDateYmd: q.endDate };
}

async function assertDriverBelongsToAgency(agencyId: string, driverId: string): Promise<void> {
    const row = await AppDataSource.getRepository(User)
        .createQueryBuilder('u')
        .innerJoin('u.role', 'r')
        .where('u.id = :driverId', { driverId })
        .andWhere('u.agency_id = :agencyId', { agencyId })
        .andWhere('r.name = :rn', { rn: 'DRIVER' })
        .getOne();
    if (!row) {
        throw new BadRequestException('Tài xế không thuộc nhà xe hoặc không hợp lệ.');
    }
}

function applyViolationDriverFilters(
    qb: SelectQueryBuilder<AiViolation>,
    agencyId: string,
    from: Date,
    to: Date,
    driverId?: string,
    violationType?: ViolationType,
) {
    qb.innerJoin('av.trip', 't')
        .where('t.agency_id = :agencyId', { agencyId })
        .andWhere('av.occurred_at BETWEEN :from AND :to', { from, to });
    if (driverId) {
        qb.andWhere('av.driver_id = :driverId', { driverId });
    }
    if (violationType) {
        qb.andWhere('av.type = :vt', { vt: violationType });
    }
}

function applyTripCompletedFilters(
    qb: SelectQueryBuilder<Trip>,
    agencyId: string,
    from: Date,
    to: Date,
    driverId?: string,
) {
    qb.where('t.agency_id = :agencyId', { agencyId })
        .andWhere('t.status = :st', { st: TripStatus.COMPLETED })
        .andWhere('t.actual_end_time IS NOT NULL')
        .andWhere('t.actual_end_time BETWEEN :from AND :to', { from, to });
    if (driverId) {
        qb.andWhere('t.driver_id = :driverId', { driverId });
    }
}

export async function getAgencyDashboard(agencyId: string, q: AgencyReportQueryInput) {
    const { from, to, startDateYmd, endDateYmd } = parseRange(q);
    if (q.driverId) {
        await assertDriverBelongsToAgency(agencyId, q.driverId);
    }

    const tripRepo = AppDataSource.getRepository(Trip);
    const avRepo = AppDataSource.getRepository(AiViolation);
    const scoreRepo = AppDataSource.getRepository(DriverScore);

    const tripsCountQb = tripRepo.createQueryBuilder('t').select('COUNT(*)', 'cnt');
    applyTripCompletedFilters(tripsCountQb, agencyId, from, to, q.driverId);
    const totalCompletedTrips = await tripsCountQb.getRawOne<{ cnt: string }>();

    const totalViolationsQb = avRepo.createQueryBuilder('av').select('COUNT(*)', 'cnt');
    applyViolationDriverFilters(totalViolationsQb, agencyId, from, to, q.driverId, q.violationType);
    const totalViolations = await totalViolationsQb.getRawOne<{ cnt: string }>();

    const byTypeQb = avRepo
        .createQueryBuilder('av')
        .select('av.type', 'type')
        .addSelect('COUNT(*)', 'count');
    applyViolationDriverFilters(byTypeQb, agencyId, from, to, q.driverId, q.violationType);
    const byTypeRows = await byTypeQb.groupBy('av.type').getRawMany<{ type: string; count: string }>();

    const tripsDayQb = tripRepo
        .createQueryBuilder('t')
        .select("to_char(timezone('Asia/Ho_Chi_Minh', t.actual_end_time), 'YYYY-MM-DD')", 'day')
        .addSelect('COUNT(*)', 'count');
    applyTripCompletedFilters(tripsDayQb, agencyId, from, to, q.driverId);
    const tripsDayRaw = await tripsDayQb
        .groupBy("to_char(timezone('Asia/Ho_Chi_Minh', t.actual_end_time), 'YYYY-MM-DD')")
        .orderBy('day', 'ASC')
        .getRawMany<{ day: string; count: string }>();

    const violDayQb = avRepo
        .createQueryBuilder('av')
        .select("to_char(timezone('Asia/Ho_Chi_Minh', av.occurred_at), 'YYYY-MM-DD')", 'day')
        .addSelect('COUNT(*)', 'count');
    applyViolationDriverFilters(violDayQb, agencyId, from, to, q.driverId, q.violationType);
    const violDayRaw = await violDayQb
        .groupBy("to_char(timezone('Asia/Ho_Chi_Minh', av.occurred_at), 'YYYY-MM-DD')")
        .orderBy('day', 'ASC')
        .getRawMany<{ day: string; count: string }>();

    const ymEnd = formatYearMonthInVN(to);
    const avgRow = await scoreRepo
        .createQueryBuilder('ds')
        .select('AVG(ds.final_score)', 'avg')
        .where('ds.agency_id = :agencyId', { agencyId })
        .andWhere('ds.evaluation_month = :ym', { ym: ymEnd })
        .getRawOne<{ avg: string | null }>();

    const tripsByDayMap = new Map(tripsDayRaw.map((r) => [r.day, Number(r.count)]));
    const violByDayMap = new Map(violDayRaw.map((r) => [r.day, Number(r.count)]));
    const allDays = enumerateVNDateStringsInclusive(startDateYmd, endDateYmd);

    const totalV = Number(totalViolations?.cnt ?? 0);
    const violationsByType = byTypeRows.map((r) => ({
        type: r.type,
        count: Number(r.count),
        percent: totalV > 0 ? Math.round((Number(r.count) / totalV) * 10000) / 100 : 0,
    }));

    const avgParsed = avgRow?.avg != null ? Number.parseFloat(String(avgRow.avg)) : NaN;

    return {
        range: { startDate: startDateYmd, endDate: endDateYmd },
        filters: {
            driverId: q.driverId ?? null,
            violationType: q.violationType ?? null,
        },
        summary: {
            totalCompletedTrips: Number(totalCompletedTrips?.cnt ?? 0),
            totalViolations: totalV,
            violationsByType,
            /** Trung bình `final_score` trong tháng chứa `endDate` (VN), theo bảng `driver_scores`. */
            averageSafetyScoreMonthOfEnd: Number.isFinite(avgParsed) ? Math.round(avgParsed * 100) / 100 : null,
            evaluationMonthForScore: ymEnd,
        },
        charts: {
            tripsByDay: allDays.map((d) => ({ date: d, completedTrips: tripsByDayMap.get(d) ?? 0 })),
            violationsByDay: allDays.map((d) => ({ date: d, violations: violByDayMap.get(d) ?? 0 })),
        },
    };
}

export type DriverExportRow = {
    username: string;
    full_name: string;
    completed_trips: number;
    violations: number;
    total_deducted: number;
    final_score: number | null;
};

async function fetchDriverExportRows(
    agencyId: string,
    from: Date,
    to: Date,
    ymEnd: string,
    driverId?: string,
    violationType?: ViolationType,
): Promise<DriverExportRow[]> {
    const params: unknown[] = [agencyId, from, to, ymEnd];
    let idx = 5;
    let avTypeSql = '';
    if (violationType) {
        avTypeSql = `AND av.type = $${idx}`;
        params.push(violationType);
        idx += 1;
    }
    let driverSql = '';
    if (driverId) {
        driverSql = `AND u.id = $${idx}`;
        params.push(driverId);
        idx += 1;
    }

    const sql = `
SELECT u.username AS username,
       u.full_name AS full_name,
       (SELECT COUNT(*)::int FROM trips t
        WHERE t.agency_id = $1 AND t.driver_id = u.id AND t.status = 'COMPLETED'
          AND t.actual_end_time IS NOT NULL
          AND t.actual_end_time >= $2 AND t.actual_end_time <= $3) AS completed_trips,
       (SELECT COUNT(*)::int FROM ai_violations av
        INNER JOIN trips t ON t.id = av.trip_id
        WHERE t.agency_id = $1 AND av.driver_id = u.id
          AND av.occurred_at >= $2 AND av.occurred_at <= $3 ${avTypeSql}) AS violations,
       (SELECT COALESCE(SUM(COALESCE(vc.points_to_subtract, 0)), 0)::int FROM ai_violations av
        INNER JOIN trips t ON t.id = av.trip_id
        LEFT JOIN violation_configs vc ON vc.id = av.config_id
        WHERE t.agency_id = $1 AND av.driver_id = u.id
          AND av.occurred_at >= $2 AND av.occurred_at <= $3 ${avTypeSql}) AS total_deducted,
       (SELECT ds.final_score FROM driver_scores ds
        WHERE ds.agency_id = $1 AND ds.driver_id = u.id AND ds.evaluation_month = $4
        LIMIT 1) AS final_score
FROM users u
INNER JOIN roles r ON r.id = u.role_id
WHERE u.agency_id = $1 AND r.name = 'DRIVER' ${driverSql}
ORDER BY u.username`;

    const raw = await AppDataSource.query(sql, params);
    return (raw as Record<string, unknown>[]).map((row) => ({
        username: String(row.username),
        full_name: String(row.full_name),
        completed_trips: Number(row.completed_trips ?? 0),
        violations: Number(row.violations ?? 0),
        total_deducted: Number(row.total_deducted ?? 0),
        final_score: row.final_score != null && row.final_score !== '' ? Number(row.final_score) : null,
    }));
}

export async function getExportRowsForAgency(agencyId: string, q: AgencyReportQueryInput): Promise<{
    rows: DriverExportRow[];
    hasData: boolean;
    range: { startDate: string; endDate: string };
}> {
    const { from, to, startDateYmd, endDateYmd } = parseRange(q);
    if (q.driverId) {
        await assertDriverBelongsToAgency(agencyId, q.driverId);
    }
    const ymEnd = formatYearMonthInVN(to);
    const rows = await fetchDriverExportRows(agencyId, from, to, ymEnd, q.driverId, q.violationType);
    const totalTrips = rows.reduce((s, r) => s + r.completed_trips, 0);
    const totalViol = rows.reduce((s, r) => s + r.violations, 0);
    const hasData = totalTrips > 0 || totalViol > 0;
    return {
        rows,
        hasData,
        range: { startDate: startDateYmd, endDate: endDateYmd },
    };
}

export async function buildAgencyReportExcelBuffer(
    agencyId: string,
    q: AgencyReportQueryInput,
): Promise<{ buffer: Buffer; filename: string } | null> {
    const { rows, hasData, range } = await getExportRowsForAgency(agencyId, q);
    if (!hasData) {
        return null;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bao cao');
    ws.columns = [
        { header: 'Ma tai xe', key: 'username', width: 18 },
        { header: 'Ho ten', key: 'full_name', width: 28 },
        { header: 'Tong chuyen hoan thanh', key: 'completed_trips', width: 22 },
        { header: 'So loi AI', key: 'violations', width: 14 },
        { header: 'Tong diem tru', key: 'total_deducted', width: 16 },
        { header: 'Diem an toan cuoi ky', key: 'final_score', width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const r of rows) {
        ws.addRow({
            username: r.username,
            full_name: r.full_name,
            completed_trips: r.completed_trips,
            violations: r.violations,
            total_deducted: r.total_deducted,
            final_score: r.final_score ?? 'N/A',
        });
    }
    const buf = await wb.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
    const filename = `bao-cao-nha-xe_${range.startDate}_${range.endDate}.xlsx`;
    return { buffer, filename };
}
