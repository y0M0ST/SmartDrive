import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createVehicleService,
  deleteVehicleService,
  listVehiclesService,
  updateVehicleService,
} from './vehicle.service';

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

export const createVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createVehicleService(req.body, req.admin!);

    switch (result.code) {
      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Can gan dai ly cho xe khach', error: 'AGENCY_REQUIRED' } as ApiResponse);

      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay dai ly', error: 'AGENCY_NOT_FOUND' } as ApiResponse);

      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Dai ly dang tam ngung hoat dong', error: 'AGENCY_INACTIVE' } as ApiResponse);

      case 'DUPLICATE_LICENSE_PLATE':
        return res.status(409).json({
          success: false,
          message: 'Biển số xe này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_LICENSE_PLATE',
        } as ApiResponse);

      default:
        return res.status(201).json({
          success: true,
          message: 'Thêm xe khách thành công',
          data: result.data,
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
    const result = await updateVehicleService(vehicleId, req.body, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy xe khách',
          error: 'NOT_FOUND',
        } as ApiResponse);

      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Ban khong duoc phep sua xe cua dai ly khac', error: 'FORBIDDEN' } as ApiResponse);

      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Can gan dai ly cho xe khach', error: 'AGENCY_REQUIRED' } as ApiResponse);

      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay dai ly', error: 'AGENCY_NOT_FOUND' } as ApiResponse);

      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Dai ly dang tam ngung hoat dong', error: 'AGENCY_INACTIVE' } as ApiResponse);

      case 'DUPLICATE_LICENSE_PLATE':
        return res.status(409).json({
          success: false,
          message: 'Biển số xe này đã tồn tại trong hệ thống',
          error: 'DUPLICATE_LICENSE_PLATE',
        } as ApiResponse);

      default:
        return res.status(200).json({
          success: true,
          message: 'Cập nhật xe khách thành công',
          data: result.data,
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
    const result = await deleteVehicleService(vehicleId, req.admin!);

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
          message: 'Ban khong duoc phep xoa xe cua dai ly khac',
          error: 'FORBIDDEN',
        } as ApiResponse);

      case 'VEHICLE_ON_TRIP':
        return res.status(409).json({
          success: false,
          message: 'Khong the xoa xe dang trong chuyen di',
          error: 'VEHICLE_ON_TRIP',
          data: result.data,
        } as ApiResponse);

      case 'VEHICLE_HAS_LINKED_DATA':
        return res.status(409).json({
          success: false,
          message: 'Khong the xoa xe nay vi da co du lieu lien ket',
          error: 'VEHICLE_HAS_LINKED_DATA',
        } as ApiResponse);

      default:
        return res.status(200).json({
          success: true,
          message: 'Xoa xe khach thanh cong',
          data: result.data,
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