// driver.controller.ts
import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import { createDriverService, deleteDriverService, getDriverByIdService, listDriversService, updateDriverService } from './driver.service';

export const listDrivers = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const result = await listDriversService({
      page, limit,
      search: req.query.search?.toString(),
      status: req.query.status?.toString(),
      agency_id: req.query.agency_id?.toString(),
    }, req.user!);
    return res.status(200).json({
      success: true, message: 'Lấy danh sách tài xế thành công',
      data: result.rows,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) || 1 },
    } as PaginatedResponse);
  } catch (err) {
    console.error('[Drivers] List error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const getDriverById = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getDriverByIdService(driverId, req.user!);
    switch (result.code) {
      case 'NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN': return res.status(403).json({ success: false, message: 'Bạn không có quyền xem tài xế này', error: 'FORBIDDEN' } as ApiResponse);
      default: return res.status(200).json({ success: true, message: 'Lấy thông tin tài xế thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Drivers] GetById error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const createDriver = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createDriverService(req.body, req.user!);
    switch (result.code) {
      case 'AGENCY_REQUIRED': return res.status(400).json({ success: false, message: 'Cần chỉ định đại lý cho tài xế', error: 'AGENCY_REQUIRED' } as ApiResponse);
      case 'AGENCY_NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);
      case 'USER_NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng', error: 'USER_NOT_FOUND' } as ApiResponse);
      case 'DUPLICATE_PHONE': return res.status(409).json({ success: false, message: 'Số điện thoại đã tồn tại trong hệ thống', error: 'DUPLICATE_PHONE' } as ApiResponse);
      case 'DUPLICATE_LICENSE': return res.status(409).json({ success: false, message: 'Số bằng lái đã tồn tại trong hệ thống', error: 'DUPLICATE_LICENSE' } as ApiResponse);
      case 'DUPLICATE_IDENTITY_CARD': return res.status(409).json({ success: false, message: 'Số CCCD đã tồn tại trong hệ thống', error: 'DUPLICATE_IDENTITY_CARD' } as ApiResponse);
      case 'PAST_LICENSE_EXPIRY': return res.status(400).json({ success: false, message: 'Ngày hết hạn bằng lái không hợp lệ (phải là ngày trong tương lai)', error: 'PAST_LICENSE_EXPIRY' } as ApiResponse);
      default: return res.status(201).json({ success: true, message: 'Thêm tài xế thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Drivers] Create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateDriver = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateDriverService(driverId, req.body, req.user!);
    switch (result.code) {
      case 'NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN': return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa tài xế này', error: 'FORBIDDEN' } as ApiResponse);
      case 'DUPLICATE_PHONE': return res.status(409).json({ success: false, message: 'Số điện thoại đã tồn tại', error: 'DUPLICATE_PHONE' } as ApiResponse);
      case 'DUPLICATE_LICENSE': return res.status(409).json({ success: false, message: 'Số bằng lái đã tồn tại', error: 'DUPLICATE_LICENSE' } as ApiResponse);
      case 'INVALID_STATUS': return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ', error: 'INVALID_STATUS' } as ApiResponse);
      default: return res.status(200).json({ success: true, message: 'Cập nhật tài xế thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Drivers] Update error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteDriver = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteDriverService(driverId, req.user!);
    switch (result.code) {
      case 'NOT_FOUND': return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN': return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tài xế này', error: 'FORBIDDEN' } as ApiResponse);
      case 'DRIVER_ON_TRIP': return res.status(409).json({ success: false, message: 'Không thể xóa tài xế đang trong chuyến đi', error: 'DRIVER_ON_TRIP' } as ApiResponse);
      default: return res.status(200).json({ success: true, message: 'Xóa tài xế thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Drivers] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};