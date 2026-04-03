import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  listAdminsService,
  getAdminByIdService,
  createAdminService,
  updateAdminService,
  deleteAdminService,
} from './admin.service';

export const listAdmins = async (req: AuthRequest, res: Response) => {
  try {
    const page      = Number(req.query.page  || 1);
    const limit     = Number(req.query.limit || 10);
    const search    = req.query.search?.toString();
    const role      = req.query.role?.toString();
    const agency_id = req.query.agency_id?.toString();
    const is_active = req.query.is_active?.toString();

    const result = await listAdminsService({
      page, limit, search, role, agency_id, is_active,
      admin: req.admin!,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tài khoản thành công',
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    } as PaginatedResponse<any>);
  } catch (err) {
    console.error('[Admins] List error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const getAdminById = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result   = await getAdminByIdService(targetId, req.admin!);

    switch (result.code) {
      case 'FORBIDDEN':
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem tài khoản này',
          error: 'FORBIDDEN',
        } as ApiResponse);

      case 'NOT_FOUND':
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản',
          error: 'NOT_FOUND',
        } as ApiResponse);

      default:
        return res.status(200).json({
          success: true,
          message: 'Lấy thông tin tài khoản thành công',
          data: result.data,
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Admins] GetById error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createAdminService(req.body, req.admin!);

    switch (result.code) {
      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Cần gán đại lý cho agency_manager', error: 'AGENCY_REQUIRED' } as ApiResponse);
      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);
      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Đại lý đang tạm ngưng hoạt động', error: 'AGENCY_INACTIVE' } as ApiResponse);
      case 'SUPER_ADMIN_NO_AGENCY':
        return res.status(400).json({ success: false, message: 'super_admin không được gán đại lý', error: 'SUPER_ADMIN_NO_AGENCY' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email này đã được sử dụng', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      default:
        return res.status(201).json({
          success: true,
          message: 'Tạo tài khoản thành công',
          data: result.data,
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Admins] Create error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const updateAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result   = await updateAdminService(targetId, req.body, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này', error: 'FORBIDDEN' } as ApiResponse);
      case 'CANNOT_CHANGE_OWN_ROLE':
        return res.status(409).json({ success: false, message: 'Không thể thay đổi role của chính mình', error: 'CANNOT_CHANGE_OWN_ROLE' } as ApiResponse);
      case 'CANNOT_DEACTIVATE_SELF':
        return res.status(409).json({ success: false, message: 'Không thể tự khóa tài khoản của chính mình', error: 'CANNOT_DEACTIVATE_SELF' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email này đã được sử dụng', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      case 'AGENCY_REQUIRED':
        return res.status(400).json({ success: false, message: 'Cần gán đại lý cho agency_manager', error: 'AGENCY_REQUIRED' } as ApiResponse);
      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'AGENCY_NOT_FOUND' } as ApiResponse);
      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Đại lý đang tạm ngưng hoạt động', error: 'AGENCY_INACTIVE' } as ApiResponse);
      default:
        return res.status(200).json({
          success: true,
          message: 'Cập nhật tài khoản thành công',
          data: result.data,
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Admins] Update error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result   = await deleteAdminService(targetId, req.admin!);

    switch (result.code) {
      case 'CANNOT_DELETE_SELF':
        return res.status(409).json({ success: false, message: 'Không thể xóa tài khoản của chính mình', error: 'CANNOT_DELETE_SELF' } as ApiResponse);
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản', error: 'NOT_FOUND' } as ApiResponse);
      case 'ADMIN_HAS_LINKED_DATA':
        return res.status(409).json({ success: false, message: 'Không thể xóa tài khoản này vì đã có dữ liệu liên kết', error: 'ADMIN_HAS_LINKED_DATA' } as ApiResponse);
      default:
        return res.status(200).json({
          success: true,
          message: 'Xóa tài khoản thành công',
          data: result.data,
        } as ApiResponse);
    }
  } catch (err) {
    console.error('[Admins] Delete error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};