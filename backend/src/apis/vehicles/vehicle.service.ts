import { ILike, Not } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Vehicle } from '../../entities/vehicle.entity';
import { VehicleStatus } from '../../common/constants/enums';
import { CreateVehicleInput, UpdateVehicleInput, GetVehicleQuery } from './vehicle.dto';
import { AppError } from '../../common/errors/app-error';

const normalizeLicensePlate = (plate: string) => plate.trim().toUpperCase();
const normalizeCameraId = (cameraId?: string | null) => {
    if (cameraId === null) return null;
    if (typeof cameraId !== 'string') return undefined;
    const normalized = cameraId.trim();
    return normalized.length ? normalized : null;
};

// ==========================================
// 1. LẤY DANH SÁCH XE (Kèm Phân trang, Search)
// ==========================================
export const getVehicles = async (query: GetVehicleQuery, agencyId: string) => {
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereCondition: any = { agency_id: agencyId };
    if (query.status) whereCondition.status = query.status;
    if (query.type) whereCondition.type = query.type;
    if (query.search) {
        whereCondition.license_plate = ILike(`%${query.search}%`);
    }

    const [vehicles, total] = await vehicleRepo.findAndCount({
        where: whereCondition,
        order: { created_at: 'DESC' },
        skip,
        take: limit,
    });

    return {
        data: vehicles,
        meta: { total, currentPage: page, totalPages: Math.ceil(total / limit) }
    };
};

// ==========================================
// 2. THÊM XE MỚI
// ==========================================
export const createVehicle = async (agencyId: string, input: CreateVehicleInput) => {
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const normalizedLicensePlate = normalizeLicensePlate(input.license_plate);
    const normalizedCameraId = normalizeCameraId(input.ai_camera_id);

    // Check trùng biển số trong cùng nhà xe
    const existPlate = await vehicleRepo.findOneBy({ agency_id: agencyId, license_plate: normalizedLicensePlate });
    if (existPlate) throw new AppError('Biển số xe này đã tồn tại trong hệ thống!', 409);

    // Check trùng Camera (Nếu có nhập)
    if (normalizedCameraId) {
        const existCam = await vehicleRepo.findOneBy({ agency_id: agencyId, ai_camera_id: normalizedCameraId });
        if (existCam) {
            throw new AppError(
                `Mã Camera ${normalizedCameraId} đang được gắn cho xe ${existCam.license_plate}. Vui lòng gỡ liên kết trước!`,
                409,
            );
        }
    }

    const newVehicle = vehicleRepo.create({
        ...input,
        license_plate: normalizedLicensePlate,
        ai_camera_id: normalizedCameraId ?? null,
        agency_id: agencyId,
        status: VehicleStatus.AVAILABLE, // Mặc định là Sẵn sàng
    });

    return await vehicleRepo.save(newVehicle);
};

// ==========================================
// 3. CẬP NHẬT XE
// ==========================================
export const updateVehicle = async (agencyId: string, vehicleId: string, input: UpdateVehicleInput) => {
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const vehicle = await vehicleRepo.findOneBy({ id: vehicleId, agency_id: agencyId });
    if (!vehicle) throw new AppError('Không tìm thấy phương tiện', 404);

    const normalizedLicensePlate = input.license_plate ? normalizeLicensePlate(input.license_plate) : undefined;
    const normalizedCameraId = input.ai_camera_id !== undefined ? normalizeCameraId(input.ai_camera_id) : undefined;

    // Check trùng biển số
    if (normalizedLicensePlate) {
        const existPlate = await vehicleRepo.findOneBy({ agency_id: agencyId, license_plate: normalizedLicensePlate, id: Not(vehicleId) });
        if (existPlate) throw new AppError('Biển số xe này đã bị trùng với xe khác!', 409);
    }

    // Check trùng Camera
    if (normalizedCameraId) {
        const existCam = await vehicleRepo.findOneBy({ agency_id: agencyId, ai_camera_id: normalizedCameraId, id: Not(vehicleId) });
        if (existCam) throw new AppError(`Mã Camera này đang được gắn cho xe ${existCam.license_plate}!`, 409);
    }

    Object.assign(vehicle, {
        ...input,
        ...(normalizedLicensePlate ? { license_plate: normalizedLicensePlate } : {}),
        ...(normalizedCameraId !== undefined ? { ai_camera_id: normalizedCameraId } : {}),
    });
    await vehicleRepo.save(vehicle);
    return true;
};

// ==========================================
// 4. ĐỔI TRẠNG THÁI (BẢO DƯỠNG, SẴN SÀNG...)
// ==========================================
export const changeVehicleStatus = async (agencyId: string, vehicleId: string, status: string) => {
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const vehicle = await vehicleRepo.findOneBy({ id: vehicleId, agency_id: agencyId });
    if (!vehicle) throw new AppError('Không tìm thấy phương tiện', 404);

    // Nếu xe đang chạy ngoài đường thì không được cho đi bảo dưỡng ngang xương
    if (vehicle.status === VehicleStatus.IN_SERVICE && status !== VehicleStatus.IN_SERVICE) {
        throw new AppError('Xe đang trong chuyến đi (IN_SERVICE), không thể đổi trạng thái ngay lúc này!', 400);
    }

    vehicle.status = status;
    await vehicleRepo.save(vehicle);
    return true;
};

// ==========================================
// 5. XÓA XE (SOFT DELETE)
// ==========================================
export const deleteVehicle = async (agencyId: string, vehicleId: string) => {
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const vehicle = await vehicleRepo.findOneBy({ id: vehicleId, agency_id: agencyId });

    if (!vehicle) throw new AppError('Không tìm thấy phương tiện', 404);

    // Đang chạy thì không được xóa
    if (vehicle.status === VehicleStatus.IN_SERVICE) {
        throw new AppError('Không thể xóa xe đang ở trạng thái "Đang chạy"!', 400);
    }

    await vehicleRepo.softDelete(vehicleId);
    return true;
};