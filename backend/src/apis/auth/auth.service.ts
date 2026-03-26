import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/database';
import { addToBlacklist } from '../../common/utils/tokenBlacklist';
import { sendMail } from '../../config/mailer';

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

export const forgotPasswordService = async (email: string) => {
  // 1. Kiểm tra email tồn tại
  const result = await pool.query(
    'SELECT * FROM admins WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  const admin = result.rows[0];
  if (!admin) return { code: 'EMAIL_NOT_FOUND' };

  // 2. Tạo OTP 6 số
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Lưu OTP vào DB, hết hạn sau 15 phút
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await pool.query(
    `UPDATE admins
     SET password_reset_token = $1, password_reset_expires = $2
     WHERE id = $3`,
    [otp, expires, admin.id]
  );

  // 4. Gửi email
  await sendMail(
    email,
    'SmartDrive - Mã OTP đặt lại mật khẩu',
    `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1B3A6B;">SmartDrive</h2>
      <p>Xin chào <strong>${admin.full_name}</strong>,</p>
      <p>Mã OTP đặt lại mật khẩu của bạn là:</p>
      <div style="
        background: #f0f4f8;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        margin: 20px 0;
      ">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1B3A6B;">
          ${otp}
        </span>
      </div>
      <p style="color: #e53e3e;">Mã OTP có hiệu lực trong <strong>15 phút</strong>.</p>
      <p>ếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <hr/>
      <p style="color: #888; font-size: 12px;">SmartDrive - Hệ thống giám sát xe khách</p>
    </div>
    `
  );

  return { code: 'SUCCESS' };
};

export const resetPasswordService = async (
  email:       string,
  otp:         string,
  newPassword: string
) => {
  // 1. Tìm admin theo email
  const result = await pool.query(
    'SELECT * FROM admins WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  const admin = result.rows[0];
  if (!admin) return { code: 'EMAIL_NOT_FOUND' };

  // 2. Kiểm tra OTP có tồn tại không
  if (!admin.password_reset_token) {
    return { code: 'OTP_NOT_FOUND' };
  }

  // 3. Kiểm tra OTP có đúng không
  if (admin.password_reset_token !== otp) {
    return { code: 'INVALID_OTP' };
  }

  // 4. Kiểm tra OTP có hết hạn không
  const now = new Date();
  if (new Date(admin.password_reset_expires) < now) {
    return { code: 'OTP_EXPIRED' };
  }

  // 5. Hash mật khẩu mới
  const newHash = await bcrypt.hash(newPassword, 12);

  // 6. Cập nhật mật khẩu + xóa OTP
  await pool.query(
    `UPDATE admins SET
      password_hash          = $1,
      password_reset_token   = NULL,
      password_reset_expires = NULL
     WHERE id = $2`,
    [newHash, admin.id]
  );

  return { code: 'SUCCESS' };
};