import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/database';
import { addToBlacklist } from '../../common/utils/tokenBlacklist';

export const loginService = async (email: string, password: string) => {

  // 1. Tìm tài khoản
  const result = await pool.query(
    'SELECT * FROM admins WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  const admin = result.rows[0];

  // 2. Không tìm thấy tài khoản
  if (!admin) return { code: 'INVALID_CREDENTIALS' };

  // 3. Tài khoản bị khóa
  if (!admin.is_active) return { code: 'ACCOUNT_DISABLED' };

  // 4. Sai mật khẩu
  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) return { code: 'INVALID_CREDENTIALS' };

  // 5. Sinh token
  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' } as jwt.SignOptions
  );

  return {
    code: 'SUCCESS',
    data: {
      token,
      admin: {
        id:        admin.id,
        email:     admin.email,
        full_name: admin.full_name,
        role:      admin.role,
      }
    }
  };
};

export const logoutService = (token: string): void => {
  addToBlacklist(token);
};

export const changePasswordService = async (adminId: string, oldPassword: string, newPassword: string) => {
  // 1. Lấy thông tin admin
  const result = await pool.query(
    'SELECT * FROM admins WHERE id = $1',
    [adminId]
  );
  const admin = result.rows[0];
  if (!admin) return { code: 'NOT_FOUND' };

  // 2. Kiểm tra mật khẩu cũ
  const isValid = await bcrypt.compare(oldPassword, admin.password_hash);
  if (!isValid) return { code: 'WRONG_OLD_PASSWORD' };

  // 3. Hash mật khẩu mới
  const newHash = await bcrypt.hash(newPassword, 12);

  // 4. Cập nhật vào DB
  await pool.query(
    'UPDATE admins SET password_hash = $1 WHERE id = $2',
    [newHash, adminId]
  );

  return { code: 'SUCCESS' };
};