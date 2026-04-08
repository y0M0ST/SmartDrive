import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../../config/database';
import { addToBlacklist } from '../../common/utils/tokenBlacklist';
import { sendMail } from '../../config/mailer';
import type { AuthPrincipal } from '../../common/middlewares/auth.middleware';

type AdminAuthAccount = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_active: boolean;
  agency_id: string | null;
  agency_name: string | null;
  agency_status: string | null;
  password_reset_token: string | null;
  password_reset_expires: Date | string | null;
  account_type: 'admin';
  driver_id: null;
  driver_status: null;
  must_change_password: false;
};

type DriverAuthAccount = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'driver';
  is_active: boolean;
  agency_id: string | null;
  agency_name: string | null;
  agency_status: string | null;
  password_reset_token: string | null;
  password_reset_expires: Date | string | null;
  account_type: 'driver';
  driver_id: string;
  driver_status: string;
  must_change_password: boolean;
};

type LoginCandidate = AdminAuthAccount | DriverAuthAccount;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getAdminAccountByEmail = async (email: string): Promise<AdminAuthAccount | null> => {
  const result = await pool.query(
    `SELECT
       a.id,
       a.email,
       a.password_hash,
       a.full_name,
       a.role,
       a.is_active,
       a.agency_id,
       ag.name AS agency_name,
       ag.status AS agency_status,
       a.password_reset_token,
       a.password_reset_expires
     FROM admins a
     LEFT JOIN agencies ag ON ag.id = a.agency_id
     WHERE LOWER(a.email) = LOWER($1)`,
    [email]
  );

  const admin = result.rows[0];
  if (!admin) return null;

  return {
    ...admin,
    account_type: 'admin',
    driver_id: null,
    driver_status: null,
    must_change_password: false,
  } as AdminAuthAccount;
};

const getDriverAccountByEmail = async (email: string): Promise<DriverAuthAccount | null> => {
  const result = await pool.query(
    `SELECT
       da.id,
       da.username AS email,
       da.password_hash,
       da.is_active,
       da.must_change_password,
       da.password_reset_token,
       da.password_reset_expires,
       da.driver_id,
       d.full_name,
       d.status AS driver_status,
       d.agency_id,
       ag.name AS agency_name,
       ag.status AS agency_status
     FROM driver_accounts da
     INNER JOIN drivers d ON d.id = da.driver_id
     INNER JOIN agencies ag ON ag.id = d.agency_id
     WHERE LOWER(da.username) = LOWER($1)`,
    [email]
  );

  const driverAccount = result.rows[0];
  if (!driverAccount) return null;

  return {
    ...driverAccount,
    role: 'driver',
    account_type: 'driver',
  } as DriverAuthAccount;
};

const buildAuthUserPayload = (account: LoginCandidate) => ({
  id: account.id,
  email: account.email,
  full_name: account.full_name,
  role: account.role,
  account_type: account.account_type,
  agency_id: account.agency_id,
  agency_name: account.agency_name,
  driver_id: account.account_type === 'driver' ? account.driver_id : null,
  must_change_password: account.account_type === 'driver' ? account.must_change_password : false,
});

const buildJwtToken = (account: LoginCandidate) => jwt.sign(
  {
    id: account.id,
    email: account.email,
    role: account.role,
    account_type: account.account_type,
    agency_id: account.agency_id,
    agency_name: account.agency_name,
    driver_id: account.account_type === 'driver' ? account.driver_id : null,
  },
  process.env.JWT_SECRET as string,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    jwtid: randomUUID(),
  } as jwt.SignOptions
);

const buildResetPasswordMail = (fullName: string, otp: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
    <h2 style="color: #1B3A6B;">SmartDrive</h2>
    <p>Xin chào <strong>${fullName}</strong>,</p>
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
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    <hr/>
    <p style="color: #888; font-size: 12px;">SmartDrive - Hệ thống giám sát xe khách</p>
  </div>
`;

export const loginService = async (email: string, password: string) => {
  const normalizedEmail = normalizeEmail(email);
  const [adminAccount, driverAccount] = await Promise.all([
    getAdminAccountByEmail(normalizedEmail),
    getDriverAccountByEmail(normalizedEmail),
  ]);

  const candidates = [adminAccount, driverAccount].filter(Boolean) as LoginCandidate[];
  if (!candidates.length) return { code: 'ACCOUNT_NOT_FOUND' };

  let matchedAccount: LoginCandidate | null = null;
  for (const candidate of candidates) {
    const isValidPassword = await bcrypt.compare(password, candidate.password_hash);
    if (isValidPassword) {
      matchedAccount = candidate;
      break;
    }
  }

  if (!matchedAccount) return { code: 'WRONG_PASSWORD' };

  if (!matchedAccount.is_active || (matchedAccount.account_type === 'driver' && matchedAccount.driver_status === 'banned')) {
    return { code: 'ACCOUNT_BLOCKED' };
  }

  if ((matchedAccount.role === 'agency_manager' || matchedAccount.account_type === 'driver')
    && (!matchedAccount.agency_id || matchedAccount.agency_status !== 'active')) {
    return { code: 'AGENCY_INACTIVE' };
  }

  if (matchedAccount.account_type === 'driver') {
    await pool.query(
      'UPDATE driver_accounts SET last_login_at = NOW() WHERE id = $1',
      [matchedAccount.id]
    );
  }

  const token = buildJwtToken(matchedAccount);
  const user = buildAuthUserPayload(matchedAccount);

  return {
    code: 'SUCCESS',
    data: {
      token,
      user,
      ...(matchedAccount.account_type === 'admin' ? { admin: user } : {}),
      ...(matchedAccount.account_type === 'driver' ? { driver_account: user } : {}),
    }
  };
};

export const logoutService = (token: string): void => {
  addToBlacklist(token);
};

export const changePasswordService = async (authUser: AuthPrincipal, oldPassword: string, newPassword: string) => {
  if (authUser.account_type === 'driver') {
    const result = await pool.query(
      'SELECT id, password_hash FROM driver_accounts WHERE id = $1',
      [authUser.id]
    );
    const driverAccount = result.rows[0];
    if (!driverAccount) return { code: 'NOT_FOUND' };

    const isValid = await bcrypt.compare(oldPassword, driverAccount.password_hash);
    if (!isValid) return { code: 'WRONG_OLD_PASSWORD' };

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE driver_accounts
       SET password_hash = $1,
           must_change_password = FALSE,
           password_reset_token = NULL,
           password_reset_expires = NULL
       WHERE id = $2`,
      [newHash, authUser.id]
    );

    return { code: 'SUCCESS' };
  }

  const result = await pool.query(
    'SELECT id, password_hash FROM admins WHERE id = $1',
    [authUser.id]
  );
  const admin = result.rows[0];
  if (!admin) return { code: 'NOT_FOUND' };

  const isValid = await bcrypt.compare(oldPassword, admin.password_hash);
  if (!isValid) return { code: 'WRONG_OLD_PASSWORD' };

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE admins
     SET password_hash = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL
     WHERE id = $2`,
    [newHash, authUser.id]
  );

  return { code: 'SUCCESS' };
};

export const forgotPasswordService = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const adminAccount = await getAdminAccountByEmail(normalizedEmail);
  const driverAccount = adminAccount ? null : await getDriverAccountByEmail(normalizedEmail);
  const account = adminAccount ?? driverAccount;

  if (!account) return { code: 'EMAIL_NOT_FOUND' };

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  if (account.account_type === 'admin') {
    await pool.query(
      `UPDATE admins
       SET password_reset_token = $1, password_reset_expires = $2
       WHERE id = $3`,
      [otp, expires, account.id]
    );
  } else {
    await pool.query(
      `UPDATE driver_accounts
       SET password_reset_token = $1, password_reset_expires = $2
       WHERE id = $3`,
      [otp, expires, account.id]
    );
  }

  await sendMail(
    normalizedEmail,
    'SmartDrive - Mã OTP đặt lại mật khẩu',
    buildResetPasswordMail(account.full_name, otp)
  );

  return { code: 'SUCCESS' };
};

export const resetPasswordService = async (
  email: string,
  otp: string,
  newPassword: string
) => {
  const normalizedEmail = normalizeEmail(email);
  const adminAccount = await getAdminAccountByEmail(normalizedEmail);
  const driverAccount = adminAccount ? null : await getDriverAccountByEmail(normalizedEmail);
  const account = adminAccount ?? driverAccount;

  if (!account) return { code: 'EMAIL_NOT_FOUND' };

  if (!account.password_reset_token) {
    return { code: 'OTP_NOT_FOUND' };
  }

  if (account.password_reset_token !== otp) {
    return { code: 'INVALID_OTP' };
  }

  const now = new Date();
  if (!account.password_reset_expires || new Date(account.password_reset_expires) < now) {
    return { code: 'OTP_EXPIRED' };
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  if (account.account_type === 'admin') {
    await pool.query(
      `UPDATE admins SET
        password_hash          = $1,
        password_reset_token   = NULL,
        password_reset_expires = NULL
       WHERE id = $2`,
      [newHash, account.id]
    );
  } else {
    await pool.query(
      `UPDATE driver_accounts SET
        password_hash          = $1,
        must_change_password   = FALSE,
        password_reset_token   = NULL,
        password_reset_expires = NULL
       WHERE id = $2`,
      [newHash, account.id]
    );
  }

  return { code: 'SUCCESS' };
};