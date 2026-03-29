import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import {
  createDriverAccountService,
  deleteDriverAccountService,
  listDriverAccountsService,
  resetDriverAccountPasswordService,
  updateDriverAccountService,
} from './driverAccount.service';

export const listDriverAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search?.toString();
    const agency_id = req.query.agency_id?.toString();
    const is_active = req.query.is_active === undefined
      ? undefined
      : req.query.is_active?.toString() === 'true';

    const result = await listDriverAccountsService({
      page,
      limit,
      search,
      agency_id,
      is_active,
      admin: req.admin!,
    });

    return res.status(200).json({
      success: true,
      message: 'Lay danh sach tai khoan tai xe thanh cong',
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    } as PaginatedResponse<any>);
  } catch (err) {
    console.error('[DriverAccounts] List error:', err);
    return res.status(500).json({
      success: false,
      message: 'Loi he thong, vui long thu lai sau',
      error: 'INTERNAL_ERROR',
    } as ApiResponse);
  }
};

export const createDriverAccount = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createDriverAccountService(req.body, req.admin!);

    switch (result.code) {
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Agency Manager chi duoc tao tai khoan tai xe trong dai ly cua minh', error: 'FORBIDDEN' } as ApiResponse);
      case 'DRIVER_NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay tai xe', error: 'DRIVER_NOT_FOUND' } as ApiResponse);
      case 'AGENCY_MANAGER_NOT_FOUND':
        return res.status(409).json({ success: false, message: 'Dai ly cua tai xe chua co Agency Manager dang hoat dong de tao tai khoan', error: 'AGENCY_MANAGER_NOT_FOUND' } as ApiResponse);
      case 'ACCOUNT_ALREADY_EXISTS_FOR_DRIVER':
        return res.status(409).json({ success: false, message: 'Tai xe nay da co tai khoan dang nhap', error: 'ACCOUNT_ALREADY_EXISTS_FOR_DRIVER' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email tai khoan tai xe da ton tai', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      default:
        return res.status(201).json({ success: true, message: 'Tao tai khoan tai xe thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[DriverAccounts] Create error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateDriverAccount = async (req: AuthRequest, res: Response) => {
  try {
    const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateDriverAccountService(accountId, req.body, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan tai xe', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Ban khong duoc phep sua tai khoan tai xe cua dai ly khac', error: 'FORBIDDEN' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email tai khoan tai xe da ton tai', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Cap nhat tai khoan tai xe thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[DriverAccounts] Update error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const resetDriverAccountPassword = async (req: AuthRequest, res: Response) => {
  try {
    const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await resetDriverAccountPasswordService(accountId, req.body.new_password, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan tai xe', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Ban khong duoc phep reset mat khau tai khoan nay', error: 'FORBIDDEN' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Reset mat khau tai khoan tai xe thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[DriverAccounts] Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteDriverAccount = async (req: AuthRequest, res: Response) => {
  try {
    const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteDriverAccountService(accountId, req.admin!);

    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan tai xe', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Ban khong duoc phep xoa tai khoan tai xe cua dai ly khac', error: 'FORBIDDEN' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Xoa tai khoan tai xe thanh cong', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[DriverAccounts] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Loi he thong, vui long thu lai sau', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};