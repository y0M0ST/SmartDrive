import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../../config/database';
import { sendMail } from '../../config/mailer';

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

type ListDriverAccountsOptions = {
  page: number;
  limit: number;
  search?: string;
  agency_id?: string;
  is_active?: boolean;
  admin: AuthAdmin;
};

type CreateDriverAccountPayload = {
  driver_id: string;
  email: string;
};

type UpdateDriverAccountPayload = {
  email?: string;
  is_active?: boolean;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateDefaultPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%&*';
  const all = upper + lower + digits + specials;
  const pick = (charset: string) => charset[crypto.randomInt(charset.length)];
  const mandatory = [pick(upper), pick(lower), pick(digits), pick(specials)];
  for (let i = 0; i < 8; i++) mandatory.push(pick(all));
  for (let i = mandatory.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [mandatory[i], mandatory[j]] = [mandatory[j], mandatory[i]];
  }
  return mandatory.join('');
};

const buildNewAccountMail = (fullName: string, email: string, password: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
    <h2 style="color: #1B3A6B;">SmartDrive</h2>
    <p>Xin chào <strong>${fullName}</strong>,</p>
    <p>Tài khoản tài xế của bạn đã được tạo thành công.</p>
    <table style="background: #f0f4f8; border-radius: 8px; padding: 16px; width: 100%; margin: 16px 0;">
      <tr><td style="padding:4px 8px; color:#555;">Email đăng nhập:</td><td style="font-weight:bold;">${email}</td></tr>
      <tr><td style="padding:4px 8px; color:#555;">Mật khẩu tạm:</td><td style="font-weight:bold; letter-spacing:2px;">${password}</td></tr>
    </table>
    <p style="color: #e53e3e;">Bạn sẽ được yêu cầu <strong>đổi mật khẩu</strong> ngay lần đăng nhập đầu tiên.</p>
    <hr/>
    <p style="color: #888; font-size: 12px;">SmartDrive - Hệ thống giám sát xe khách</p>
  </div>
`;

const buildResetPasswordMail = (fullName: string, newPassword: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
    <h2 style="color: #1B3A6B;">SmartDrive</h2>
    <p>Xin chào <strong>${fullName}</strong>,</p>
    <p>Quản trị viên đã đặt lại mật khẩu tài khoản tài xế của bạn.</p>
    <div style="background: #f0f4f8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1B3A6B;">${newPassword}</span>
    </div>
    <p style="color: #e53e3e;">Bạn sẽ được yêu cầu <strong>đổi mật khẩu</strong> ngay lần đăng nhập tiếp theo.</p>
    <hr/>
    <p style="color: #888; font-size: 12px;">SmartDrive - Hệ thống giám sát xe khách</p>
  </div>
`;

const getAgencyManagerCreatorId = async (agencyId: string) => {
  const result = await pool.query(
    `SELECT id
     FROM admins
     WHERE agency_id = $1
       AND role = 'agency_manager'
       AND is_active = TRUE
     ORDER BY created_at ASC
     LIMIT 1`,
    [agencyId]
  );

  return result.rows[0]?.id as string | undefined;
};

const getDriverAccountById = async (accountId: string) => {
  const result = await pool.query(
    `SELECT
       da.id,
       da.driver_id,
       da.username AS email,
       da.is_active,
       da.must_change_password,
       da.last_login_at,
       da.created_by_admin_id,
       da.created_at,
       da.updated_at,
       d.full_name AS driver_full_name,
       d.phone AS driver_phone,
       d.status AS driver_status,
       d.agency_id,
       ag.name AS agency_name,
       creator.full_name AS created_by_admin_name
     FROM driver_accounts da
     INNER JOIN drivers d ON d.id = da.driver_id
     INNER JOIN agencies ag ON ag.id = d.agency_id
     LEFT JOIN admins creator ON creator.id = da.created_by_admin_id
     WHERE da.id = $1`,
    [accountId]
  );

  return result.rows[0];
};

export const listDriverAccountsService = async ({
  page,
  limit,
  search,
  agency_id,
  is_active,
  admin,
}: ListDriverAccountsOptions) => {
  const offset = (page - 1) * limit;
  const filters: string[] = [];
  const values: Array<string | number | boolean> = [];

  if (search) {
    values.push(`%${search.trim()}%`);
    filters.push(`(
      da.username ILIKE $${values.length}
      OR d.full_name ILIKE $${values.length}
      OR d.phone ILIKE $${values.length}
    )`);
  }

  if (typeof is_active === 'boolean') {
    values.push(is_active);
    filters.push(`da.is_active = $${values.length}`);
  }

  if (admin.role === 'super_admin' && agency_id) {
    values.push(agency_id);
    filters.push(`d.agency_id = $${values.length}`);
  }

  if (admin.role !== 'super_admin') {
    values.push(admin.agency_id as string);
    filters.push(`d.agency_id = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM driver_accounts da
     INNER JOIN drivers d ON d.id = da.driver_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT
       da.id,
       da.driver_id,
       da.username AS email,
       da.is_active,
       da.must_change_password,
       da.last_login_at,
       da.created_by_admin_id,
       da.created_at,
       da.updated_at,
       d.full_name AS driver_full_name,
       d.phone AS driver_phone,
       d.status AS driver_status,
       d.agency_id,
       ag.name AS agency_name,
       creator.full_name AS created_by_admin_name
     FROM driver_accounts da
     INNER JOIN drivers d ON d.id = da.driver_id
     INNER JOIN agencies ag ON ag.id = d.agency_id
     LEFT JOIN admins creator ON creator.id = da.created_by_admin_id
     ${whereClause}
     ORDER BY da.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0].total,
  };
};

export const createDriverAccountService = async (payload: CreateDriverAccountPayload, admin: AuthAdmin) => {
  if (!['agency_manager', 'super_admin'].includes(admin.role)) return { code: 'FORBIDDEN' };

  const driverResult = await pool.query(
    `SELECT id, agency_id, full_name
     FROM drivers
     WHERE id = $1`,
    [payload.driver_id]
  );
  const driver = driverResult.rows[0];

  if (!driver) return { code: 'DRIVER_NOT_FOUND' };
  if (admin.role === 'agency_manager' && driver.agency_id !== admin.agency_id) return { code: 'FORBIDDEN' };

  let creatorAdminId = admin.id;
  if (admin.role === 'super_admin') {
    const agencyManagerCreatorId = await getAgencyManagerCreatorId(driver.agency_id);
    if (!agencyManagerCreatorId) return { code: 'AGENCY_MANAGER_NOT_FOUND' };
    creatorAdminId = agencyManagerCreatorId;
  }

  const existingAccountForDriver = await pool.query(
    'SELECT id FROM driver_accounts WHERE driver_id = $1',
    [driver.id]
  );
  if (existingAccountForDriver.rows[0]) return { code: 'ACCOUNT_ALREADY_EXISTS_FOR_DRIVER' };

  const normalizedEmail = normalizeEmail(payload.email);
  const duplicateEmail = await pool.query(
    'SELECT id FROM driver_accounts WHERE username = $1',
    [normalizedEmail]
  );
  const duplicateAdminEmail = await pool.query(
    'SELECT id FROM admins WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  if (duplicateEmail.rows[0] || duplicateAdminEmail.rows[0]) return { code: 'DUPLICATE_EMAIL' };

  const defaultPassword = generateDefaultPassword();
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  const result = await pool.query(
    `INSERT INTO driver_accounts (
      driver_id,
      username,
      password_hash,
      is_active,
      must_change_password,
      created_by_admin_id
    )
    VALUES ($1, $2, $3, TRUE, TRUE, $4)
    RETURNING id`,
    [driver.id, normalizedEmail, passwordHash, creatorAdminId]
  );

  await sendMail(
    normalizedEmail,
    'SmartDrive - Tai khoan tai xe cua ban da duoc tao',
    buildNewAccountMail(driver.full_name, normalizedEmail, defaultPassword)
  );

  const createdAccount = await getDriverAccountById(result.rows[0].id);
  return { code: 'SUCCESS', data: createdAccount };
};

export const updateDriverAccountService = async (accountId: string, payload: UpdateDriverAccountPayload, admin: AuthAdmin) => {
  const existingAccount = await getDriverAccountById(accountId);
  if (!existingAccount) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingAccount.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  let nextEmail = existingAccount.email;
  if (payload.email !== undefined) {
    nextEmail = normalizeEmail(payload.email);
    const duplicateEmail = await pool.query(
      'SELECT id FROM driver_accounts WHERE username = $1 AND id <> $2',
      [nextEmail, accountId]
    );
    const duplicateAdminEmail = await pool.query(
      'SELECT id FROM admins WHERE LOWER(email) = LOWER($1)',
      [nextEmail]
    );
    if (duplicateEmail.rows[0] || duplicateAdminEmail.rows[0]) return { code: 'DUPLICATE_EMAIL' };
  }

  const result = await pool.query(
    `UPDATE driver_accounts
     SET username = $1,
         is_active = $2
     WHERE id = $3
     RETURNING id`,
    [
      nextEmail,
      payload.is_active === undefined ? existingAccount.is_active : payload.is_active,
      accountId,
    ]
  );

  const updatedAccount = await getDriverAccountById(result.rows[0].id);
  return { code: 'SUCCESS', data: updatedAccount };
};

export const resetDriverAccountPasswordService = async (accountId: string, admin: AuthAdmin) => {
  const existingAccount = await getDriverAccountById(accountId);
  if (!existingAccount) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingAccount.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  const newPassword = generateDefaultPassword();
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE driver_accounts
     SET password_hash = $1,
         must_change_password = TRUE,
         password_reset_token = NULL,
         password_reset_expires = NULL
     WHERE id = $2`,
    [passwordHash, accountId]
  );

  await sendMail(
    existingAccount.email,
    'SmartDrive - Mat khau tai khoan tai xe da duoc dat lai',
    buildResetPasswordMail(existingAccount.driver_full_name, newPassword)
  );

  const updatedAccount = await getDriverAccountById(accountId);
  return { code: 'SUCCESS', data: updatedAccount };
};

export const deleteDriverAccountService = async (accountId: string, admin: AuthAdmin) => {
  const existingAccount = await getDriverAccountById(accountId);
  if (!existingAccount) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingAccount.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  await pool.query('DELETE FROM driver_accounts WHERE id = $1', [accountId]);
  return {
    code: 'SUCCESS',
    data: {
      id: existingAccount.id,
      driver_id: existingAccount.driver_id,
      email: existingAccount.email,
      agency_id: existingAccount.agency_id,
    },
  };
};

/* ─── Driver self-service ─── */

export const getMyDriverAccountService = async (driverAccountId: string) => {
  const account = await getDriverAccountById(driverAccountId);
  if (!account) return { code: 'NOT_FOUND' };
  return { code: 'SUCCESS', data: account };
};

export const updateMyDriverAccountEmailService = async (driverAccountId: string, newEmail: string) => {
  const existingAccount = await getDriverAccountById(driverAccountId);
  if (!existingAccount) return { code: 'NOT_FOUND' };

  const normalizedEmail = normalizeEmail(newEmail);
  const duplicateEmail = await pool.query(
    'SELECT id FROM driver_accounts WHERE username = $1 AND id <> $2',
    [normalizedEmail, driverAccountId]
  );
  const duplicateAdminEmail = await pool.query(
    'SELECT id FROM admins WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  if (duplicateEmail.rows[0] || duplicateAdminEmail.rows[0]) return { code: 'DUPLICATE_EMAIL' };

  await pool.query(
    'UPDATE driver_accounts SET username = $1 WHERE id = $2',
    [normalizedEmail, driverAccountId]
  );

  const updatedAccount = await getDriverAccountById(driverAccountId);
  return { code: 'SUCCESS', data: updatedAccount };
};