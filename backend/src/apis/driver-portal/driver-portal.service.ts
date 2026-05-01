import { AppDataSource } from '../../config/data-source';
import { Trip } from '../../entities/trip.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { TripCheckin } from '../../entities/trip-checkin.entity';
import { CheckinResult, TripStatus } from '../../common/constants/enums';
import { AppError, BadRequestException } from '../../common/errors/app-error';
import type { GetMyTripsQuery, SaveFaceTemplateBody, TripCheckinBody } from './driver-portal.dto';

const FACE_ENCODING_DIM = 128;

export type DriverPortalRouteDto = {
    id: string;
    code: string;
    name: string;
    start_point: string;
    end_point: string;
    distance_km: number;
    estimated_hours: number;
    status: string;
};

export type DriverPortalVehicleDto = {
    id: string;
    license_plate: string;
    type: string;
    status: string;
};

export type DriverPortalAgencyDto = {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    address: string | null;
    status: string;
};

export type DriverPortalTripListItem = {
    id: string;
    trip_code: string;
    status: string;
    departure_time: Date;
    planned_end_time: Date;
    actual_start_time: Date | null;
    actual_end_time: Date | null;
    cancel_reason: string | null;
    route: DriverPortalRouteDto;
    vehicle: DriverPortalVehicleDto;
    agency: DriverPortalAgencyDto;
};

const mapTrip = (t: Trip): DriverPortalTripListItem => ({
    id: t.id,
    trip_code: t.trip_code,
    status: t.status,
    departure_time: t.departure_time,
    planned_end_time: t.planned_end_time,
    actual_start_time: t.actual_start_time ?? null,
    actual_end_time: t.actual_end_time ?? null,
    cancel_reason: t.cancel_reason ?? null,
    route: {
        id: t.route.id,
        code: t.route.code,
        name: t.route.name,
        start_point: t.route.start_point,
        end_point: t.route.end_point,
        distance_km: t.route.distance_km,
        estimated_hours: t.route.estimated_hours,
        status: t.route.status,
    },
    vehicle: {
        id: t.vehicle.id,
        license_plate: t.vehicle.license_plate,
        type: t.vehicle.type,
        status: t.vehicle.status,
    },
    agency: {
        id: t.agency.id,
        code: t.agency.code,
        name: t.agency.name,
        phone: t.agency.phone ?? null,
        address: t.agency.address ?? null,
        status: t.agency.status,
    },
});

/**
 * US_15 — Lịch trình của tài xế đang đăng nhập.
 * `driverUserId` phải là `req.user.id` từ JWT (không từ query/body).
 */
const getMyTripsImpl = async (driverUserId: string, query: GetMyTripsQuery) => {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const tripRepo = AppDataSource.getRepository(Trip);

    const [rows, total] = await tripRepo.findAndCount({
        where: { driver_id: driverUserId },
        relations: ['route', 'vehicle', 'agency'],
        order: { departure_time: 'DESC' },
        skip,
        take: limit,
    });

    return {
        data: rows.map(mapTrip),
        meta: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit) || 1,
            limit,
        },
    };
};

const assertFaceEncodingArray = (value: unknown): number[] => {
    if (!Array.isArray(value) || value.length !== FACE_ENCODING_DIM) {
        throw new AppError('Dữ liệu face_encoding trên hệ thống không hợp lệ.', 500);
    }
    for (let i = 0; i < value.length; i += 1) {
        const n = value[i];
        if (typeof n !== 'number' || !Number.isFinite(n)) {
            throw new AppError('Dữ liệu face_encoding trên hệ thống không hợp lệ.', 500);
        }
    }
    return value as number[];
};

const parseStoredFaceEncoding = (raw: string | null | undefined): number[] | null => {
    if (raw === null || raw === undefined || String(raw).trim() === '') {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as unknown;
        return assertFaceEncodingArray(parsed);
    } catch (e) {
        if (e instanceof AppError) throw e;
        throw new AppError('Dữ liệu face_encoding trên hệ thống không hợp lệ.', 500);
    }
};

const saveFaceTemplateImpl = async (driverUserId: string, body: SaveFaceTemplateBody) => {
    const profileRepo = AppDataSource.getRepository(DriverProfile);
    const profile = await profileRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) {
        throw new AppError('Không tìm thấy hồ sơ tài xế.', 404);
    }
    if (profile.is_locked) {
        throw new AppError(
            'Tài khoản điểm danh khuôn mặt của bạn đang bị khóa. Vui lòng liên hệ nhà xe / vận hành để mở khóa.',
            403,
        );
    }
    profile.face_encoding = JSON.stringify(body.faceEncoding);
    await profileRepo.save(profile);
    return { faceEncoding: body.faceEncoding };
};

const getFaceTemplateImpl = async (driverUserId: string) => {
    const profileRepo = AppDataSource.getRepository(DriverProfile);
    const profile = await profileRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) {
        throw new AppError('Không tìm thấy hồ sơ tài xế.', 404);
    }
    const parsed = parseStoredFaceEncoding(profile.face_encoding);
    if (!parsed) {
        throw new AppError('Bạn chưa đăng ký mẫu khuôn mặt.', 404);
    }
    return { faceEncoding: parsed, is_locked: !!profile.is_locked };
};

const CHECKIN_FAIL_MESSAGE = 'Nhận diện khuôn mặt thất bại';

const CHECKIN_LOCKED_MESSAGE =
    'Điểm danh khuôn mặt của tài khoản bị tạm khóa do thử sai quá nhiều lần. Vui lòng liên hệ nhà xe / bộ phận vận hành để được mở khóa.';

export type CheckinTripOutcome =
    | { kind: 'SUCCESS'; trip: DriverPortalTripListItem }
    | { kind: 'LOCKED'; message: string; locked: true };

const checkinTripImpl = async (
    driverUserId: string,
    tripId: string,
    body: TripCheckinBody,
): Promise<CheckinTripOutcome> => {
    const tripRepo = AppDataSource.getRepository(Trip);
    const checkinRepo = AppDataSource.getRepository(TripCheckin);
    const profileRepo = AppDataSource.getRepository(DriverProfile);

    const profile = await profileRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) {
        throw new AppError('Không tìm thấy hồ sơ tài xế.', 404);
    }
    if (profile.is_locked) {
        throw new AppError(
            'Tài khoản điểm danh khuôn mặt của bạn đang bị khóa. Vui lòng liên hệ nhà xe / vận hành để mở khóa.',
            403,
        );
    }

    const trip = await tripRepo.findOne({ where: { id: tripId } });
    if (!trip || trip.driver_id !== driverUserId) {
        throw new AppError('Không tìm thấy chuyến đi hoặc chuyến không thuộc về bạn.', 404);
    }
    if (trip.status !== TripStatus.SCHEDULED) {
        throw new BadRequestException('Chuyến đi không ở trạng thái chờ xuất bến (SCHEDULED).');
    }

    const { result, matchScore } = body;

    if (result === CheckinResult.SUCCESS) {
        await AppDataSource.transaction(async (manager) => {
            const tRepo = manager.getRepository(Trip);
            const cRepo = manager.getRepository(TripCheckin);
            trip.status = TripStatus.IN_PROGRESS;
            trip.actual_start_time = new Date();
            await tRepo.save(trip);
            await cRepo.save(
                cRepo.create({
                    trip_id: trip.id,
                    driver_id: driverUserId,
                    device_id: null,
                    match_score: matchScore,
                    result: CheckinResult.SUCCESS,
                }),
            );
        });
        const updated = await tripRepo.findOne({
            where: { id: tripId },
            relations: ['route', 'vehicle', 'agency'],
        });
        if (!updated) {
            throw new AppError('Không tìm thấy chuyến đi sau khi cập nhật.', 500);
        }
        return { kind: 'SUCCESS', trip: mapTrip(updated) };
    }

    if (result === CheckinResult.LOCKED) {
        await AppDataSource.transaction(async (manager) => {
            const pRepo = manager.getRepository(DriverProfile);
            const cRepo = manager.getRepository(TripCheckin);
            const p = await pRepo.findOne({ where: { user_id: driverUserId } });
            if (!p) {
                throw new AppError('Không tìm thấy hồ sơ tài xế.', 404);
            }
            p.is_locked = true;
            await pRepo.save(p);
            await cRepo.save(
                cRepo.create({
                    trip_id: trip.id,
                    driver_id: driverUserId,
                    device_id: null,
                    match_score: matchScore,
                    result: CheckinResult.LOCKED,
                }),
            );
        });
        return { kind: 'LOCKED', message: CHECKIN_LOCKED_MESSAGE, locked: true };
    }

    await checkinRepo.save(
        checkinRepo.create({
            trip_id: trip.id,
            driver_id: driverUserId,
            device_id: null,
            match_score: matchScore,
            result,
        }),
    );
    throw new BadRequestException(CHECKIN_FAIL_MESSAGE);
};

export const DriverPortalService = {
    getMyTrips: getMyTripsImpl,
    saveFaceTemplate: saveFaceTemplateImpl,
    getFaceTemplate: getFaceTemplateImpl,
    checkinTrip: checkinTripImpl,
};

export const getMyTrips = DriverPortalService.getMyTrips;
export const saveFaceTemplate = DriverPortalService.saveFaceTemplate;
export const getFaceTemplate = DriverPortalService.getFaceTemplate;
export const checkinTrip = DriverPortalService.checkinTrip;
