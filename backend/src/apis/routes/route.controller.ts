import { Response } from 'express';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createRouteService,
  deleteRouteService,
  getRouteByIdService,
  listRoutesService,
  updateRouteService,
} from './route.service';

export const listRoutes = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listRoutesService();
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tuyến đường thành công',
      data: rows,
    } as ApiResponse);
  } catch (err) {
    console.error('[Routes] List error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const getRouteById = async (req: AuthRequest, res: Response) => {
  try {
    const routeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getRouteByIdService(routeId);

    if (result.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tuyến đường', error: 'NOT_FOUND' } as ApiResponse);
    }

    return res.status(200).json({ success: true, message: 'Lấy thông tin tuyến đường thành công', data: result.data } as ApiResponse);
  } catch (err) {
    console.error('[Routes] GetById error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const createRoute = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createRouteService(req.body);

    switch (result.code) {
      case 'SAME_ORIGIN_DESTINATION':
        return res.status(400).json({ success: false, message: 'Điểm đến không được trùng với điểm xuất phát', error: 'SAME_ORIGIN_DESTINATION' } as ApiResponse);
      case 'DUPLICATE_NAME':
        return res.status(409).json({ success: false, message: 'Tên tuyến đường đã tồn tại', error: 'DUPLICATE_NAME' } as ApiResponse);
      default:
        return res.status(201).json({ success: true, message: 'Thêm tuyến đường thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Routes] Create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateRoute = async (req: AuthRequest, res: Response) => {
  try {
    const routeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateRouteService(routeId, req.body);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy tuyến đường', error: 'NOT_FOUND' } as ApiResponse);
      case 'SAME_ORIGIN_DESTINATION':
        return res.status(400).json({ success: false, message: 'Điểm đến không được trùng với điểm xuất phát', error: 'SAME_ORIGIN_DESTINATION' } as ApiResponse);
      case 'DUPLICATE_NAME':
        return res.status(409).json({ success: false, message: 'Tên tuyến đường đã tồn tại', error: 'DUPLICATE_NAME' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Cập nhật tuyến đường thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Routes] Update error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteRoute = async (req: AuthRequest, res: Response) => {
  try {
    const routeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteRouteService(routeId);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy tuyến đường', error: 'NOT_FOUND' } as ApiResponse);
      case 'ROUTE_HAS_ACTIVE_TRIPS':
        return res.status(409).json({
          success: false,
          message: 'Không thể xóa tuyến đường đang có lịch trình hoạt động. Vui lòng chuyển trạng thái sang Tạm ngưng',
          error: 'ROUTE_HAS_ACTIVE_TRIPS',
        } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Xóa tuyến đường thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Routes] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};