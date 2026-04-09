// user.controller.ts
import { Response } from 'express';
import { ApiResponse } from '../../common/types/response';
import { AuthRequest } from '../../common/middlewares/auth.middleware';
import { createUserService, deleteUserService, listUsersService, updateUserService } from './user.service';

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listUsersService(req.user!);
    return res.status(200).json({ success: true, message: 'Lấy danh sách tài khoản thành công', data: rows } as ApiResponse);
  } catch (err) {
    console.error('[Users] List error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createUserService(req.body, req.user!);
    switch (result.code) {
      case 'INVALID_ROLE':
        return res.status(400).json({ success: false, message: 'Role không hợp lệ', error: 'INVALID_ROLE' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email đã tồn tại trong hệ thống', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      case 'DUPLICATE_USERNAME':
        return res.status(409).json({ success: false, message: 'Username đã tồn tại trong hệ thống', error: 'DUPLICATE_USERNAME' } as ApiResponse);
      default:
        return res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Users] Create error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateUserService(userId, req.body, req.user!);
    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản', error: 'NOT_FOUND' } as ApiResponse);
      case 'FORBIDDEN':
        return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa tài khoản này', error: 'FORBIDDEN' } as ApiResponse);
      case 'DUPLICATE_EMAIL':
        return res.status(409).json({ success: false, message: 'Email đã tồn tại trong hệ thống', error: 'DUPLICATE_EMAIL' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Cập nhật tài khoản thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Users] Update error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteUserService(userId, req.user!);
    switch (result.code) {
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản', error: 'NOT_FOUND' } as ApiResponse);
      case 'CANNOT_DELETE_SUPER_ADMIN':
        return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Super Admin', error: 'CANNOT_DELETE_SUPER_ADMIN' } as ApiResponse);
      case 'CANNOT_DELETE_SELF':
        return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản của chính mình', error: 'CANNOT_DELETE_SELF' } as ApiResponse);
      case 'USER_ON_TRIP':
        return res.status(409).json({ success: false, message: 'Không thể xóa tài khoản đang trong chuyến đi', error: 'USER_ON_TRIP' } as ApiResponse);
      default:
        return res.status(200).json({ success: true, message: 'Xóa tài khoản thành công', data: result.data } as ApiResponse);
    }
  } catch (err) {
    console.error('[Users] Delete error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: 'INTERNAL_ERROR' } as ApiResponse);
  }
};