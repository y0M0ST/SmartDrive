// vehicle.controller.ts
import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import { createVehicleService, deleteVehicleService, getVehicleByIdService, listVehiclesService, updateVehicleService } from './vehicle.service';

export const listVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const result = await listVehiclesService({
      page, limit,
      search: req.query.search?.toString(),
      status: req.query.status?.toString(),
      agency_id: req.query.agency_id?.toString(),
    }, req.user!);
    return res.status(200).json({
      success: true, message: 'Lấy danh sách xe khách thành công',
      data: result.rows,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) || 1 },
    } as PaginatedResponse);
  } catch (err) {
    console.error('[Vehicles] List error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const getVehicleById = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getVehicleByIdService(vehicleId, req.user!);
    switch (result.code) {
      case 'NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy xe khách', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN': return res.status(403).json({ success: false, message: 'Bạn không có quyền xem xe này', error: 'FORBIDDEN' } as ApiResponse);
      default: return res.status(200).json({ success: true, message: 'Lấy thông tin xe thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] GetById error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const createVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createVehicleService(req.body, req.user!);
    switch (result.code) {
      case 'AGENCY_REQUIRED': return res.status(400).json({ success: false, message: 'Cần chỉ định đại lý cho xe', error: 'AGENCY_REQUIRED' } as ApiResponse);
      case 'AGENCY_NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);
      case 'DUPLICATE_PLATE': return res.status(409).json({ success: false, message: 'Biển số xe đã tồn tại', error: 'DUPLICATE_PLATE' } as ApiResponse);
      case 'DUPLICATE_CAMERA_CODE': return res.status(409).json({ success: false, message: `Camera đang được gắn trên xe ${(result as any).data?.plate_number || 'khác'}`, error: 'DUPLICATE_CAMERA_CODE', data: (result as any).data } as ApiResponse);
      default: return res.status(201).json({ success: true, message: 'Thêm xe khách thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateVehicleService(vehicleId, req.body, req.user!);
    switch (result.code) {
      case 'NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy xe khách', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN': return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa xe này', error: 'FORBIDDEN' } as ApiResponse);
      case 'DUPLICATE_PLATE': return res.status(409).json({ success: false, message: 'Biển số xe đã tồn tại', error: 'DUPLICATE_PLATE' } as ApiResponse);
      case 'DUPLICATE_CAMERA_CODE': return res.status(409).json({ success: false, message: `Camera đang được gắn trên xe ${(result as any).data?.plate_number || 'khác'}`, error: 'DUPLICATE_CAMERA_CODE', data: (result as any).data } as ApiResponse);
      case 'INVALID_STATUS': return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ', error: 'INVALID_STATUS' } as ApiResponse);
      default: return res.status(200).json({ success: true, message: 'Cập nhật xe khách thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Update error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteVehicleService(vehicleId, req.user!);
    switch (result.code) {
      case 'NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy xe khách', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN': return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa xe này', error: 'FORBIDDEN' } as ApiResponse);
      case 'VEHICLE_ON_TRIP': return res.status(409).json({ success: false, message: 'Không thể xóa xe đang trong chuyến đi', error: 'VEHICLE_ON_TRIP' } as ApiResponse);
      default: return res.status(200).json({ success: true, message: 'Xóa xe khách thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Vehicles] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};