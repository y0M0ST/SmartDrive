import { Response } from 'express';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createAgencyService,
  deleteAgencyService,
  getAgencyByIdService,
  listAgenciesService,
  updateAgencyService,
} from './agency.service';

export const listAgencies = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listAgenciesService(req.admin!);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đại lý thành công',
      data: rows,
    } as ApiResponse);
  } catch (err) {
    console.error('[Agencies] List error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const getAgencyById = async (req: AuthRequest, res: Response) => {
  try {
    const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getAgencyByIdService(agencyId, req.admin!);

    switch (result.code) {
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đại lý này', error: 'FORBIDDEN' } as ApiResponse);
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'NOT_FOUND' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Lấy thông tin đại lý thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] GetById error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const createAgency = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createAgencyService(req.body);

    switch (result.code) {
      case 'DUPLICATE_CODE':
        return res.status(409).json({ success: false, message: 'Mã đại lý đã tồn tại', error: 'DUPLICATE_CODE' } as ApiResponse);
      case 'DUPLICATE_NAME':
        return res.status(409).json({ success: false, message: 'Tên đại lý đã tồn tại', error: 'DUPLICATE_NAME' } as ApiResponse);
      default:
        return res.status(201).json({ success: true, message: 'Thêm đại lý thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] Create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateAgency = async (req: AuthRequest, res: Response) => {
  try {
    const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateAgencyService(agencyId, req.body);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'NOT_FOUND' } as ApiResponse);
      case 'DUPLICATE_CODE':
        return res.status(409).json({ success: false, message: 'Mã đại lý đã tồn tại', error: 'DUPLICATE_CODE' } as ApiResponse);
      case 'DUPLICATE_NAME':
        return res.status(409).json({ success: false, message: 'Tên đại lý đã tồn tại', error: 'DUPLICATE_NAME' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Cập nhật đại lý thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] Update error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteAgency = async (req: AuthRequest, res: Response) => {
  try {
    const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteAgencyService(agencyId);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy đại lý', error: 'NOT_FOUND' } as ApiResponse);
      case 'AGENCY_HAS_LINKED_DATA':
        return res.status(409).json({ success: false, message: 'Không thể xóa đại lý này vì vẫn còn tài khoản, tài xế hoặc phương tiện liên kết', error: 'AGENCY_HAS_LINKED_DATA', data: result.data } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Xóa đại lý thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};