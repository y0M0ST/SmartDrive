import ExcelJS from 'exceljs';
import { AppDataSource } from '../../config/data-source';
import { DriverScore } from '../../entities/driver-score.entity';
import { AiViolation } from '../../entities/ai-violation.entity';
import { User } from '../../entities/user.entity';
import { ViolationConfig } from '../../entities/violation-config.entity';
import type { ScoreQuery } from './score.dto';

const DRIVER_ROLE_NAME = 'DRIVER';

export type DriverScoreListItem = {
    driverId: string;
    fullName: string;
    month: number;
    year: number;
    totalTrips: number;
    totalDrowsy: number;
    totalDistracted: number;
    totalPointsDeducted: number;
    finalScore: number;
    calculatedAt: Date;
};

/**
 * Tính/cập nhật điểm an toàn cho TẤT CẢ tài xế trong nhà xe tại tháng/năm chỉ định.
 * Logic:
 *   1. Lấy tất cả tài xế ACTIVE trong nhà xe.
 *   2. Với mỗi tài xế, lấy ai_violations trong tháng, join violation_configs để biết điểm trừ.
 *   3. Tính final_score = max(0, 100 – total_points_deducted).
 *   4. Upsert vào driver_scores (unique: driver_id + month + year).
 */
export const recalculateScores = async (agencyId: string, month: number, year: number): Promise<number> => {
    const userRepo = AppDataSource.getRepository(User);
    const violationRepo = AppDataSource.getRepository(AiViolation);
    const configRepo = AppDataSource.getRepository(ViolationConfig);
    const scoreRepo = AppDataSource.getRepository(DriverScore);

    // Lấy tất cả tài xế (DRIVER role) thuộc nhà xe
    const drivers = await userRepo.find({
        where: { agency_id: agencyId },
        relations: ['role'],
    });
    const driverList = drivers.filter((u) => u.role?.name === DRIVER_ROLE_NAME);

    if (driverList.length === 0) return 0;

    // Lấy toàn bộ violation_configs đang active để tính điểm trừ
    const configs = await configRepo.find({ where: { is_active: true } });
    const configMap = new Map(configs.map((c) => [c.type, c.points_to_subtract]));

    // Khoảng thời gian của tháng
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 1, 0, 0, 0, 0); // exclusive

    let upserted = 0;

    for (const driver of driverList) {
        const violations = await violationRepo
            .createQueryBuilder('v')
            .where('v.driver_id = :driverId', { driverId: driver.id })
            .andWhere('v.occurred_at >= :start', { start: startOfMonth })
            .andWhere('v.occurred_at < :end', { end: endOfMonth })
            .getMany();

        // Distinct trip_ids
        const tripIds = new Set(violations.map((v) => v.trip_id));

        let totalDrowsy = 0;
        let totalDistracted = 0;
        let totalPointsDeducted = 0;

        for (const v of violations) {
            const typeUpper = v.type.toUpperCase();
            if (typeUpper === 'DROWSY') totalDrowsy += 1;
            else if (typeUpper === 'DISTRACTED') totalDistracted += 1;
            // Điểm trừ: ưu tiên config_id trên vi phạm, fallback về configMap theo type
            const pts = configMap.get(typeUpper) ?? 0;
            totalPointsDeducted += pts;
        }

        const finalScore = Math.max(0, 100 - totalPointsDeducted);

        // Upsert: nếu đã tồn tại thì cập nhật, chưa có thì tạo mới
        const existing = await scoreRepo.findOne({
            where: { driver_id: driver.id, month, year },
        });

        if (existing) {
            await scoreRepo.update(existing.id, {
                total_trips: tripIds.size,
                total_drowsy: totalDrowsy,
                total_distracted: totalDistracted,
                total_points_deducted: totalPointsDeducted,
                final_score: finalScore,
                calculated_at: new Date(),
            });
        } else {
            const newScore = scoreRepo.create({
                driver_id: driver.id,
                month,
                year,
                total_trips: tripIds.size,
                total_drowsy: totalDrowsy,
                total_distracted: totalDistracted,
                total_points_deducted: totalPointsDeducted,
                final_score: finalScore,
                calculated_at: new Date(),
            });
            await scoreRepo.save(newScore);
        }

        upserted += 1;
    }

    return upserted;
};

/**
 * Lấy bảng điểm an toàn của nhà xe theo tháng/năm (đọc từ driver_scores đã tính).
 * Nếu chưa có bản ghi nào → tự động recalculate trước khi trả về.
 */
export const getScores = async (
    agencyId: string,
    query: ScoreQuery,
): Promise<{ data: DriverScoreListItem[]; meta: object }> => {
    const { month, year, page, limit } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const scoreRepo = AppDataSource.getRepository(DriverScore);

    // Kiểm tra xem đã có bản ghi cho tháng/năm này chưa
    const existingCount = await scoreRepo
        .createQueryBuilder('s')
        .innerJoin(User, 'u', 'u.id = s.driver_id AND u.agency_id = :agencyId', { agencyId })
        .where('s.month = :month AND s.year = :year', { month, year })
        .getCount();

    // Auto-calculate nếu chưa có
    if (existingCount === 0) {
        await recalculateScores(agencyId, month, year);
    }

    const [rows, total] = await scoreRepo
        .createQueryBuilder('s')
        .innerJoin(User, 'u', 'u.id = s.driver_id AND u.agency_id = :agencyId', { agencyId })
        .addSelect(['u.id', 'u.full_name'])
        .where('s.month = :month AND s.year = :year', { month, year })
        .orderBy('s.final_score', 'DESC')
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

    // Join lại để lấy full_name của driver
    const userRepo = AppDataSource.getRepository(User);
    const driverIds = rows.map((r) => r.driver_id);
    const users =
        driverIds.length > 0
            ? await userRepo.findByIds(driverIds)
            : [];
    const userMap = new Map(users.map((u) => [u.id, u.full_name]));

    const data: DriverScoreListItem[] = rows.map((s) => ({
        driverId: s.driver_id,
        fullName: userMap.get(s.driver_id) ?? 'N/A',
        month: s.month,
        year: s.year,
        totalTrips: s.total_trips,
        totalDrowsy: s.total_drowsy,
        totalDistracted: s.total_distracted,
        totalPointsDeducted: s.total_points_deducted,
        finalScore: s.final_score,
        calculatedAt: s.calculated_at,
    }));

    return {
        data,
        meta: {
            total,
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            month: Number(month),
            year: Number(year),
        },
    };
};

/**
 * US_14 — Xuất báo cáo điểm an toàn tháng ra file Excel.
 * Lấy toàn bộ dữ liệu (không phân trang) rồi tạo buffer Excel.
 */
export const exportScoresExcel = async (agencyId: string, month: number, year: number): Promise<Buffer> => {
    const scoreRepo = AppDataSource.getRepository(DriverScore);
    const userRepo = AppDataSource.getRepository(User);

    const existingCount = await scoreRepo
        .createQueryBuilder('s')
        .innerJoin(User, 'u', 'u.id = s.driver_id AND u.agency_id = :agencyId', { agencyId })
        .where('s.month = :month AND s.year = :year', { month, year })
        .getCount();

    if (existingCount === 0) {
        await recalculateScores(agencyId, month, year);
    }

    const rows = await scoreRepo
        .createQueryBuilder('s')
        .innerJoin(User, 'u', 'u.id = s.driver_id AND u.agency_id = :agencyId', { agencyId })
        .where('s.month = :month AND s.year = :year', { month, year })
        .orderBy('s.final_score', 'DESC')
        .getMany();

    const driverIds = rows.map((r) => r.driver_id);
    const users = driverIds.length > 0 ? await userRepo.findByIds(driverIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u.full_name]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartDrive';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Điểm tháng ${month}-${year}`);

    sheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tài xế', key: 'fullName', width: 28 },
        { header: 'Số chuyến', key: 'totalTrips', width: 12 },
        { header: 'Buồn ngủ', key: 'totalDrowsy', width: 12 },
        { header: 'Mất tập trung', key: 'totalDistracted', width: 16 },
        { header: 'Tổng điểm trừ', key: 'totalPointsDeducted', width: 16 },
        { header: 'Điểm an toàn', key: 'finalScore', width: 14 },
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;

    rows.forEach((s, idx) => {
        const row = sheet.addRow({
            stt: idx + 1,
            fullName: userMap.get(s.driver_id) ?? 'N/A',
            totalTrips: s.total_trips,
            totalDrowsy: s.total_drowsy,
            totalDistracted: s.total_distracted,
            totalPointsDeducted: s.total_points_deducted,
            finalScore: s.final_score,
        });

        // Color-code score
        const scoreCell = row.getCell('finalScore');
        if (s.final_score >= 80) {
            scoreCell.font = { color: { argb: 'FF16A34A' }, bold: true };
        } else if (s.final_score >= 60) {
            scoreCell.font = { color: { argb: 'FFD97706' }, bold: true };
        } else {
            scoreCell.font = { color: { argb: 'FFDC2626' }, bold: true };
        }
    });

    sheet.autoFilter = { from: 'A1', to: 'G1' };

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
};
