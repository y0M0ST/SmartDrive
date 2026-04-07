import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createVehicleService,
  deleteVehicleService,
  getVehicleByIdService,
  listVehiclesService,
  updateVehicleService,
} from './vehicle.service';

const getResultData = (result: any) => result?.data;

export const listVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const agency_id = req.query.agency_id?.toString();

    const result = await listVehiclesService({
      page,
      limit,
      search,
      status,
      agency_id,
      admin: req.admin!,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách xe khách thành công',
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    } as PaginatedResponse<any>);
  } catch (err) {
    console.error('[Vehicles] List error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const getVehicleById = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result: any = await getVehicleByIdService(vehicleId, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy xe khách',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({
          success: false,
          message: 'Bạn không được phép xem xe của đại lý khác',
          error: 'FORBIDDEN',
        } as ApiResponse);

      case 'SUCCESS':
        return res.status(200).json({
          success: true,
          message: 'Lấy chi tiết xe khách thành công',
          data: getResultData(result),
        } as ApiResponse);

      default:
        return res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống, vui lòng thử lại sau',
          error: 'INTERNAL_ERROR',
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Get by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const createVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const result: any = await createVehicleService(req.body, req.admin!);

    switch (result.code) {
      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Cần gán đại lý cho xe khách', error: 'AGENCY_REQUIRED' } as ApiResponse);

      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);

      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Đại lý đang tạm ngưng hoạt động', error: 'AGENCY_INACTIVE' } as ApiResponse);

      case 'DUPLICATE_LICENSE_PLATE':
        return res.status(409).json({
          success: false,
          message: 'Biển số xe này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_LICENSE_PLATE',
        } as ApiResponse);

      case 'DUPLICATE_CAMERA_CODE':
        {
          const cameraConflict = getResultData(result);
        return res.status(409).json({
          success: false,
          message: `Camera này đang được gắn trên xe ${(cameraConflict as { license_plate?: string } | undefined)?.license_plate || 'khác'}, vui lòng gỡ liên kết trước`,
          error: 'DUPLICATE_CAMERA_CODE',
          data: cameraConflict,
        } as ApiResponse);
        }

      case 'SUCCESS':
        return res.status(201).json({
          success: true,
          message: 'Thêm xe khách thành công',
          data: getResultData(result),
        } as ApiResponse);

      default:
        return res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống, vui lòng thử lại sau',
          error: 'INTERNAL_ERROR',
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Create error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const updateVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result: any = await updateVehicleService(vehicleId, req.body, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy xe khách',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Bạn không được phép sửa xe của đại lý khác', error: 'FORBIDDEN' } as ApiResponse);

      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Cần gán đại lý cho xe khách', error: 'AGENCY_REQUIRED' } as ApiResponse);

      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);

      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Đại lý đang tạm ngưng hoạt động', error: 'AGENCY_INACTIVE' } as ApiResponse);

      case 'DUPLICATE_LICENSE_PLATE':
        return res.status(409).json({
          success: false,
          message: 'Biển số xe này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_LICENSE_PLATE',
        } as ApiResponse);

      case 'DUPLICATE_CAMERA_CODE':
        {
          const cameraConflict = getResultData(result);
        return res.status(409).json({
          success: false,
          message: `Camera này đang được gắn trên xe ${(cameraConflict as { license_plate?: string } | undefined)?.license_plate || 'khác'}, vui lòng gỡ liên kết trước`,
          error: 'DUPLICATE_CAMERA_CODE',
          data: cameraConflict,
        } as ApiResponse);
        }

      case 'SUCCESS':
        return res.status(200).json({
          success: true,
          message: 'Cập nhật xe khách thành công',
          data: getResultData(result),
        } as ApiResponse);

      default:
        return res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống, vui lòng thử lại sau',
          error: 'INTERNAL_ERROR',
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Update error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const deleteVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result: any = await deleteVehicleService(vehicleId, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy xe khách',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({
          success: false,
          message: 'Bạn không được phép xóa xe của đại lý khác',
          error: 'FORBIDDEN',
        } as ApiResponse);

      case 'VEHICLE_ON_TRIP':
        return res.status(409).json({
          success: false,
          message: 'Không thể xóa xe đang trong chuyến đi',
          error: 'VEHICLE_ON_TRIP',
          data: getResultData(result),
        } as ApiResponse);

      case 'VEHICLE_HAS_LINKED_DATA':
        return res.status(409).json({
          success: false,
          message: 'Không thể xóa xe này vì đã có dữ liệu liên kết',
          error: 'VEHICLE_HAS_LINKED_DATA',
        } as ApiResponse);

      case 'SUCCESS':
        return res.status(200).json({
          success: true,
          message: 'Xóa xe khách thành công',
          data: getResultData(result),
        } as ApiResponse);

      default:
        return res.status(500).json({
          success: false,
          message: 'Lỗi hệ thống, vui lòng thử lại sau',
          error: 'INTERNAL_ERROR',
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Delete error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};