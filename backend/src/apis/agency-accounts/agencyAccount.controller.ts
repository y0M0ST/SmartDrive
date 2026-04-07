import { Response } from 'express';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createAgencyAccountService,
  deleteAgencyAccountService,
  listAgencyAccountsService,
} from './agencyAccount.service';

export const listAgencyAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listAgencyAccountsService(req.admin!);

    return res.status(200).json({
      success: true,
      message: 'Lay danh sach tai khoan dai ly thanh cong',
      data: rows,
    } as ApiResponse);
  } catch (err) {
    console.error('[AgencyAccounts] List error:', err);
    return res.status(500).json({
      success: false,
      message: 'Loi he thong, vui long thu lai sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const createAgencyAccount = async (req: AuthRequest, res: Response) => {
  try {
    const agencyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await createAgencyAccountService(agencyId, req.body, req.admin!.id);

    switch (result.code) {
      case 'AGENCY_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay dai ly', error: 'AGENCY_NOT_FOUND' } as ApiResponse);
      case 'AGENCY_INACTIVE':
        return res.status(409).json({ success: false, message: 'Dai ly dang tam ngung hoat dong', error: 'AGENCY_INACTIVE' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email da ton tai trong he thong', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      default:
        return res.status(201).json({ success: true, message: 'Tao tai khoan quan ly dai ly thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[AgencyAccounts] Create error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteAgencyAccount = async (req: AuthRequest, res: Response) => {
  try {
    const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteAgencyAccountService(accountId, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan dai ly', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Chi Super Admin duoc xoa tai khoan dai ly', error: 'FORBIDDEN' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Xoa tai khoan dai ly thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[AgencyAccounts] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};
