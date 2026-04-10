"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.changeVehicleStatus = exports.updateVehicle = exports.createVehicle = exports.getVehicles = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../../config/data-source");
const vehicle_entity_1 = require("../../entities/vehicle.entity");
const enums_1 = require("../../common/constants/enums");
const app_error_1 = require("../../common/errors/app-error");
const normalizeLicensePlate = (plate) => plate.trim().toUpperCase();
const normalizeCameraId = (cameraId) => {
    if (cameraId === null)
        return null;
    if (typeof cameraId !== 'string')
        return undefined;
    const normalized = cameraId.trim();
    return normalized.length ? normalized : null;
};
// ==========================================
// 1. LẤY DANH SÁCH XE (Kèm Phân trang, Search)
// ==========================================
const getVehicles = async (query, agencyId) => {
    const vehicleRepo = data_source_1.AppDataSource.getRepository(vehicle_entity_1.Vehicle);
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const whereCondition = { agency_id: agencyId };
    if (query.status)
        whereCondition.status = query.status;
    if (query.type)
        whereCondition.type = query.type;
    if (query.search) {
        whereCondition.license_plate = (0, typeorm_1.ILike)(`%${query.search}%`);
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
exports.getVehicles = getVehicles;
// ==========================================
// 2. THÊM XE MỚI
// ==========================================
const createVehicle = async (agencyId, input) => {
    const vehicleRepo = data_source_1.AppDataSource.getRepository(vehicle_entity_1.Vehicle);
    const normalizedLicensePlate = normalizeLicensePlate(input.license_plate);
    const normalizedCameraId = normalizeCameraId(input.ai_camera_id);
    // Check trùng biển số trong cùng nhà xe
    const existPlate = await vehicleRepo.findOneBy({ agency_id: agencyId, license_plate: normalizedLicensePlate });
    if (existPlate)
        throw new app_error_1.AppError('Biển số xe này đã tồn tại trong hệ thống!', 409);
    // Check trùng Camera (Nếu có nhập)
    if (normalizedCameraId) {
        const existCam = await vehicleRepo.findOneBy({ agency_id: agencyId, ai_camera_id: normalizedCameraId });
        if (existCam) {
            throw new app_error_1.AppError(`Mã Camera ${normalizedCameraId} đang được gắn cho xe ${existCam.license_plate}. Vui lòng gỡ liên kết trước!`, 409);
        }
    }
    const newVehicle = vehicleRepo.create({
        ...input,
        license_plate: normalizedLicensePlate,
        ai_camera_id: normalizedCameraId ?? null,
        agency_id: agencyId,
        status: enums_1.VehicleStatus.AVAILABLE, // Mặc định là Sẵn sàng
    });
    return await vehicleRepo.save(newVehicle);
};
exports.createVehicle = createVehicle;
// ==========================================
// 3. CẬP NHẬT XE
// ==========================================
const updateVehicle = async (agencyId, vehicleId, input) => {
    const vehicleRepo = data_source_1.AppDataSource.getRepository(vehicle_entity_1.Vehicle);
    const vehicle = await vehicleRepo.findOneBy({ id: vehicleId, agency_id: agencyId });
    if (!vehicle)
        throw new app_error_1.AppError('Không tìm thấy phương tiện', 404);
    const normalizedLicensePlate = input.license_plate ? normalizeLicensePlate(input.license_plate) : undefined;
    const normalizedCameraId = input.ai_camera_id !== undefined ? normalizeCameraId(input.ai_camera_id) : undefined;
    // Check trùng biển số
    if (normalizedLicensePlate) {
        const existPlate = await vehicleRepo.findOneBy({ agency_id: agencyId, license_plate: normalizedLicensePlate, id: (0, typeorm_1.Not)(vehicleId) });
        if (existPlate)
            throw new app_error_1.AppError('Biển số xe này đã bị trùng với xe khác!', 409);
    }
    // Check trùng Camera
    if (normalizedCameraId) {
        const existCam = await vehicleRepo.findOneBy({ agency_id: agencyId, ai_camera_id: normalizedCameraId, id: (0, typeorm_1.Not)(vehicleId) });
        if (existCam)
            throw new app_error_1.AppError(`Mã Camera này đang được gắn cho xe ${existCam.license_plate}!`, 409);
    }
    Object.assign(vehicle, {
        ...input,
        ...(normalizedLicensePlate ? { license_plate: normalizedLicensePlate } : {}),
        ...(normalizedCameraId !== undefined ? { ai_camera_id: normalizedCameraId } : {}),
    });
    await vehicleRepo.save(vehicle);
    return true;
};
exports.updateVehicle = updateVehicle;
// ==========================================
// 4. ĐỔI TRẠNG THÁI (BẢO DƯỠNG, SẴN SÀNG...)
// ==========================================
const changeVehicleStatus = async (agencyId, vehicleId, status) => {
    const vehicleRepo = data_source_1.AppDataSource.getRepository(vehicle_entity_1.Vehicle);
    const vehicle = await vehicleRepo.findOneBy({ id: vehicleId, agency_id: agencyId });
    if (!vehicle)
        throw new app_error_1.AppError('Không tìm thấy phương tiện', 404);
    // Nếu xe đang chạy ngoài đường thì không được cho đi bảo dưỡng ngang xương
    if (vehicle.status === enums_1.VehicleStatus.IN_SERVICE && status !== enums_1.VehicleStatus.IN_SERVICE) {
        throw new app_error_1.AppError('Xe đang trong chuyến đi (IN_SERVICE), không thể đổi trạng thái ngay lúc này!', 400);
    }
    vehicle.status = status;
    await vehicleRepo.save(vehicle);
    return true;
};
exports.changeVehicleStatus = changeVehicleStatus;
// ==========================================
// 5. XÓA XE (SOFT DELETE)
// ==========================================
const deleteVehicle = async (agencyId, vehicleId) => {
    const vehicleRepo = data_source_1.AppDataSource.getRepository(vehicle_entity_1.Vehicle);
    const vehicle = await vehicleRepo.findOneBy({ id: vehicleId, agency_id: agencyId });
    if (!vehicle)
        throw new app_error_1.AppError('Không tìm thấy phương tiện', 404);
    // Đang chạy thì không được xóa
    if (vehicle.status === enums_1.VehicleStatus.IN_SERVICE) {
        throw new app_error_1.AppError('Không thể xóa xe đang ở trạng thái "Đang chạy"!', 400);
    }
    await vehicleRepo.softDelete(vehicleId);
    return true;
};
exports.deleteVehicle = deleteVehicle;
//# sourceMappingURL=vehicle.service.js.map