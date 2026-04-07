import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createDriverService,
  deleteDriverService,
  getDriverByIdService,
  listDriversService,
  updateDriverService,
} from './driver.service';

const getResultData = (result: any) => result?.data;

export const listDrivers = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const agency_id = req.query.agency_id?.toString();

    const result = await listDriversService({
      page,
      limit,
      search,
      status,
      agency_id,
      admin: req.admin!,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tài xế thành công',
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    } as PaginatedResponse<any>);
  } catch (err) {
    console.error('[Drivers] List error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const getDriverById = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result: any = await getDriverByIdService(driverId, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({
          success: false,
          message: 'Bạn không được phép xem tài xế của đại lý khác',
          error: 'FORBIDDEN',
        } as ApiResponse);

      case 'SUCCESS':
        return res.status(200).json({
          success: true,
          message: 'Lấy chi tiết tài xế thành công',
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
    console.error('[Drivers] Get by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const createDriver = async (req: AuthRequest, res: Response) => {
  try {
    const result: any = await createDriverService(req.body, req.admin!);

    switch (result.code) {
      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Cần gán đại lý cho tài xế', error: 'AGENCY_REQUIRED' } as ApiResponse);

      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);

      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Đại lý đang tạm ngưng hoạt động', error: 'AGENCY_INACTIVE' } as ApiResponse);

      case 'DUPLICATE_PHONE':
        return res.status(409).json({
          success: false,
          message: 'Số điện thoại này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_PHONE',
        } as ApiResponse);

      case 'DUPLICATE_LICENSE':
        return res.status(409).json({
          success: false,
          message: 'Số bằng lái này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_LICENSE',
        } as ApiResponse);

      case 'SUCCESS':
        return res.status(201).json({
          success: true,
          message: 'Thêm tài xế thành công',
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
    console.error('[Drivers] Create error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const updateDriver = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result: any = await updateDriverService(driverId, req.body, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Bạn không được phép sửa tài xế của đại lý khác', error: 'FORBIDDEN' } as ApiResponse);

      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Cần gán đại lý cho tài xế', error: 'AGENCY_REQUIRED' } as ApiResponse);

      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);

      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Đại lý đang tạm ngưng hoạt động', error: 'AGENCY_INACTIVE' } as ApiResponse);

      case 'DUPLICATE_PHONE':
        return res.status(409).json({
          success: false,
          message: 'Số điện thoại này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_PHONE',
        } as ApiResponse);

      case 'DUPLICATE_LICENSE':
        return res.status(409).json({
          success: false,
          message: 'Số bằng lái này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_LICENSE',
        } as ApiResponse);

      case 'SUCCESS':
        return res.status(200).json({
          success: true,
          message: 'Cập nhật tài xế thành công',
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
    console.error('[Drivers] Update error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const deleteDriver = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result: any = await deleteDriverService(driverId, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({
          success: false,
          message: 'Bạn không được phép xóa tài xế của đại lý khác',
          error: 'FORBIDDEN',
        } as ApiResponse);

      case 'DRIVER_ON_TRIP':
        return res.status(409).json({
          success: false,
          message: 'Không thể xóa tài xế đang trong chuyến đi',
          error: 'DRIVER_ON_TRIP',
          data: getResultData(result),
        } as ApiResponse);

      case 'DRIVER_HAS_LINKED_DATA':
        return res.status(409).json({
          success: false,
          message: 'Không thể xóa tài xế này vì đã có dữ liệu liên kết',
          error: 'DRIVER_HAS_LINKED_DATA',
        } as ApiResponse);

      case 'SUCCESS':
        return res.status(200).json({
          success: true,
          message: 'Xóa tài xế thành công',
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
    console.error('[Drivers] Delete error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};