import { Response } from 'express';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createAgencyService,
  deleteAgencyService,
  listAgenciesService,
  updateAgencyService,
} from './agency.service';

export const listAgencies = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listAgenciesService(req.admin!);

    return res.status(200).json({
      success: true,
      message: 'Lay danh sach dai ly thanh cong',
      data: rows,
    } as ApiResponse);
  } catch (err) {
    console.error('[Agencies] List error:', err);
    return res.status(500).json({
      success: false,
      message: 'Loi he thong, vui long thu lai sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const createAgency = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createAgencyService(req.body);

    switch (result.code) {
      case 'DUPLICATE_CODE':
        return res.status(409).json({ success: false, message: 'Ma dai ly da ton tai', error: 'DUPLICATE_CODE' } as ApiResponse);
      case 'DUPLICATE_NAME':
        return res.status(409).json({ success: false, message: 'Ten dai ly da ton tai', error: 'DUPLICATE_NAME' } as ApiResponse);
      default:
        return res.status(201).json({ success: true, message: 'Them dai ly thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] Create error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateAgency = async (req: AuthRequest, res: Response) => {
  try {
    const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateAgencyService(agencyId, req.body);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay dai ly', error: 'NOT_FOUND' } as ApiResponse);
      case 'DUPLICATE_CODE':
        return res.status(409).json({ success: false, message: 'Ma dai ly da ton tai', error: 'DUPLICATE_CODE' } as ApiResponse);
      case 'DUPLICATE_NAME':
        return res.status(409).json({ success: false, message: 'Ten dai ly da ton tai', error: 'DUPLICATE_NAME' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Cap nhat dai ly thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] Update error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteAgency = async (req: AuthRequest, res: Response) => {
  try {
    const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteAgencyService(agencyId);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay dai ly', error: 'NOT_FOUND' } as ApiResponse);
      case 'AGENCY_HAS_LINKED_DATA':
        return res.status(409).json({ success: false, message: 'Khong the xoa dai ly nay vi van con admin, tai xe hoac phuong tien lien ket', error: 'AGENCY_HAS_LINKED_DATA', data: result.data } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Xoa dai ly thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Agencies] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};