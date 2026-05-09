import os from 'os';
import { IsNull, MoreThan } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';
import { AiViolation } from '../../entities/ai-violation.entity';
import { Trip } from '../../entities/trip.entity';
import { UserSession } from '../../entities/user-session.entity';
import { getSocketIo } from '../../socket/socket-hub';

const VIOLATION_LOOKBACK_DAYS = 30;

function violationSeverity(count: number): 'cao' | 'trung bình' | 'thấp' {
    if (count >= 30) return 'cao';
    if (count >= 10) return 'trung bình';
    return 'thấp';
}

function nodeProcessCpuPercent(): number {
    const cpus = os.cpus()?.length || 1;
    const elapsedUs = process.uptime() * 1e6;
    if (elapsedUs <= 0) return 0;
    const { user, system } = process.cpuUsage();
    const used = user + system;
    const pct = (used / (elapsedUs * cpus)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
}

function systemRamPercent(): number {
    const total = os.totalmem();
    if (!total) return 0;
    const used = total - os.freemem();
    return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}

function nodeHeapPercent(): number {
    const mu = process.memoryUsage();
    if (!mu.heapTotal) return 0;
    return Math.max(0, Math.min(100, Math.round((mu.heapUsed / mu.heapTotal) * 100)));
}

export type PlatformOverviewDto = {
    active_agencies: number;
    active_sessions: number;
    socket_connections: number;
    system_ram_percent: number;
    node_heap_percent: number;
    node_cpu_process_percent: number;
    access_chart: { bucket_iso: string; label: string; count: number }[];
    violations_by_agency: {
        agency_id: string;
        agency_code: string;
        agency_name: string;
        violation_count: number;
        level: 'cao' | 'trung bình' | 'thấp';
    }[];
};

export const getPlatformOverview = async (): Promise<PlatformOverviewDto> => {
    const agencyRepo = AppDataSource.getRepository(Agency);
    const sessionRepo = AppDataSource.getRepository(UserSession);

    const active_agencies = await agencyRepo.count({ where: { status: 'ACTIVE' } });
    const active_sessions = await sessionRepo.count({
        where: { revoked_at: IsNull(), expires_at: MoreThan(new Date()) },
    });

    const io = getSocketIo();
    const socket_connections = io?.engine?.clientsCount ?? 0;

    const chartRows = await AppDataSource.query<
        Array<{ bucket: Date; count: string | number }>
    >(
        `
        WITH hours AS (
            SELECT generate_series(
                date_trunc('hour', NOW() - interval '11 hours'),
                date_trunc('hour', NOW()),
                interval '1 hour'
            ) AS bucket
        )
        SELECT h.bucket AS bucket, COALESCE(c.cnt, 0)::int AS count
        FROM hours h
        LEFT JOIN (
            SELECT date_trunc('hour', s.issued_at) AS bucket, count(*)::int AS cnt
            FROM user_sessions s
            WHERE s.issued_at >= date_trunc('hour', NOW() - interval '11 hours')
            GROUP BY 1
        ) c ON c.bucket = h.bucket
        ORDER BY h.bucket
        `,
    );

    const access_chart = chartRows.map((row) => {
        const d = row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
        const label = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return {
            bucket_iso: d.toISOString(),
            label,
            count: Number(row.count) || 0,
        };
    });

    const since = new Date();
    since.setDate(since.getDate() - VIOLATION_LOOKBACK_DAYS);

    const violRepo = AppDataSource.getRepository(AiViolation);
    const violRows = await violRepo
        .createQueryBuilder('v')
        .innerJoin(Trip, 't', 't.id = v.trip_id')
        .innerJoin(Agency, 'a', 'a.id = t.agency_id')
        .select('a.id', 'agency_id')
        .addSelect('a.code', 'agency_code')
        .addSelect('a.name', 'agency_name')
        .addSelect('COUNT(*)', 'violation_count')
        .where('v.occurred_at >= :since', { since })
        .groupBy('a.id')
        .addGroupBy('a.code')
        .addGroupBy('a.name')
        .orderBy('violation_count', 'DESC')
        .limit(10)
        .getRawMany<{
            agency_id: string;
            agency_code: string;
            agency_name: string;
            violation_count: string;
        }>();

    const violations_by_agency = violRows.map((r) => {
        const violation_count = Number(r.violation_count) || 0;
        return {
            agency_id: r.agency_id,
            agency_code: r.agency_code,
            agency_name: r.agency_name,
            violation_count,
            level: violationSeverity(violation_count),
        };
    });

    return {
        active_agencies,
        active_sessions,
        socket_connections,
        system_ram_percent: systemRamPercent(),
        node_heap_percent: nodeHeapPercent(),
        node_cpu_process_percent: nodeProcessCpuPercent(),
        access_chart,
        violations_by_agency,
    };
};
