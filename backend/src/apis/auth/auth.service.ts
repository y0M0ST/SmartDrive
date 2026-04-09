import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/database';
import { addToBlacklist } from '../../common/utils/tokenBlacklist';
import { sendMail } from '../../config/mailer';

const getUserWithRoles = async (userId: string) => {
  const result = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.status,
       COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1 AND u.is_deleted = FALSE
     GROUP BY u.id`,
    [userId]
  );
  return result.rows[0];
};

export const loginService = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Tìm user theo email
  const userResult = await pool.query(
    `SELECT u.*, 
       COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1 AND u.is_deleted = FALSE
     GROUP BY u.id`,
    [normalizedEmail]
  );
  const user = userResult.rows[0];

  // 2. Không tìm thấy
  if (!user) return { code: 'INVALID_CREDENTIALS' as const };

  // 3. Tài khoản bị khóa
  if (user.status === 'banned') return { code: 'ACCOUNT_BANNED' as const };
  if (user.status === 'inactive') return { code: 'ACCOUNT_INACTIVE' as const };

  // 4. Sai mật khẩu
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return { code: 'INVALID_CREDENTIALS' as const };

  // 5. Lấy agency_id nếu là agency_manager
  let agency_id: string | null = null;
  if (user.roles.includes('agency_manager')) {
    const agencyResult = await pool.query(
      'SELECT id FROM agencies WHERE user_id = $1 AND is_deleted = FALSE',
      [user.id]
    );
    agency_id = agencyResult.rows[0]?.id || null;
  }

  // 6. Lấy driver_id nếu là driver
  let driver_id: string | null = null;
  if (user.roles.includes('driver')) {
    const driverResult = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1',
      [user.id]
    );
    driver_id = driverResult.rows[0]?.id || null;
  }

  // 7. Sinh token
  const token = jwt.sign(
    {
      id:        user.id,
      email:     user.email,
      roles:     user.roles,
      agency_id,
      driver_id,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' } as jwt.SignOptions
  );

  return {
    code: 'SUCCESS' as const,
    data: {
      token,
      user: {
        id:        user.id,
        username:  user.username,
        email:     user.email,
        roles:     user.roles,
        agency_id,
        driver_id,
      },
    },
  };
};

export const logoutService = (token: string): void => {
  addToBlacklist(token);
};

export const changePasswordService = async (userId: string, oldPassword: string, newPassword: string) => {
  // 1. Lấy thông tin user
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE',
    [userId]
  );
  const user = result.rows[0];
  if (!user) return { code: 'NOT_FOUND' as const };
  if (user.status !== 'active') return { code: 'ACCOUNT_BLOCKED' as const };

  // 2. Kiểm tra mật khẩu cũ
  const isValid = await bcrypt.compare(oldPassword, user.password);
  if (!isValid) return { code: 'WRONG_OLD_PASSWORD' as const };

  // 3. Hash mật khẩu mới và cập nhật
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, userId]);

  return { code: 'SUCCESS' as const };
};

export const forgotPasswordService = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Tìm user
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user) return { code: 'EMAIL_NOT_FOUND' as const };
  if (user.status !== 'active') return { code: 'ACCOUNT_BLOCKED' as const };

  // 2. Tạo OTP 6 số và lưu vào DB
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `UPDATE users SET
       password_reset_token = $1,
       password_reset_expires = $2
     WHERE id = $3`,
    [otp, expires, user.id]
  );

  // 3. Gửi email
  await sendMail(
    email,
    'SmartDrive - Mã OTP đặt lại mật khẩu',
    buildOtpEmail(user.username, otp)
  );

  return { code: 'SUCCESS' as const };
};

export const resetPasswordService = async (email: string, otp: string, newPassword: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Tìm user
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE',
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user) return { code: 'EMAIL_NOT_FOUND' as const };
  if (user.status !== 'active') return { code: 'ACCOUNT_BLOCKED' as const };

  // 2. Kiểm tra OTP
  if (!user.password_reset_token) return { code: 'OTP_NOT_FOUND' as const };
  if (user.password_reset_token !== otp) return { code: 'INVALID_OTP' as const };
  if (new Date(user.password_reset_expires) < new Date()) return { code: 'OTP_EXPIRED' as const };

  // 3. Cập nhật mật khẩu mới
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE users SET
       password = $1,
       password_reset_token = NULL,
       password_reset_expires = NULL
     WHERE id = $2`,
    [newHash, user.id]
  );

  return { code: 'SUCCESS' as const };
};

const buildOtpEmail = (username: string, otp: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
    <h2 style="color: #1B3A6B;">SmartDrive</h2>
    <p>Xin chào <strong>${username}</strong>,</p>
    <p>Mã OTP đặt lại mật khẩu của bạn là:</p>
    <div style="background: #f0f4f8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1B3A6B;">
        ${otp}
      </span>
    </div>
    <p style="color: #e53e3e;">Mã OTP có hiệu lực trong <strong>15 phút</strong>.</p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    <hr/>
    <p style="color: #888; font-size: 12px;">SmartDrive - Hệ thống giám sát xe khách</p>
  </div>
`;