import bcrypt from 'bcryptjs';
import pool from '../../config/database';

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

type CreateAgencyAccountPayload = {
  email: string;
  password: string;
};

const getAgencyAccountById = async (accountId: string) => {
  const result = await pool.query(
    `SELECT
       a.id,
       a.email,
       a.full_name,
       a.role,
       a.agency_id,
       ag.name AS agency_name,
       a.is_active,
       a.created_by_admin_id,
       creator.full_name AS created_by_admin_name,
       a.created_at,
       a.updated_at
     FROM admins a
     INNER JOIN agencies ag ON ag.id = a.agency_id
     LEFT JOIN admins creator ON creator.id = a.created_by_admin_id
     WHERE a.id = $1 AND a.role = 'agency_manager' AND a.deleted_at IS NULL`,
    [accountId]
  );

  return result.rows[0];
};

export const listAgencyAccountsService = async (admin: AuthAdmin) => {
  if (admin.role === 'super_admin') {
    // 1. Super admin xem tất cả agency_manager chưa bị xóa
    const result = await pool.query(
      `SELECT
         a.id,
         a.email,
         a.full_name,
         a.role,
         a.agency_id,
         ag.name AS agency_name,
         a.is_active,
         a.created_by_admin_id,
         creator.full_name AS created_by_admin_name,
         a.created_at,
         a.updated_at
       FROM admins a
       INNER JOIN agencies ag ON ag.id = a.agency_id
       LEFT JOIN admins creator ON creator.id = a.created_by_admin_id
       WHERE a.role = 'agency_manager' AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC`
    );
    return result.rows;
  }

  // 2. Agency manager chỉ xem trong agency của mình
  const result = await pool.query(
    `SELECT
       a.id,
       a.email,
       a.full_name,
       a.role,
       a.agency_id,
       ag.name AS agency_name,
       a.is_active,
       a.created_by_admin_id,
       creator.full_name AS created_by_admin_name,
       a.created_at,
       a.updated_at
     FROM admins a
     INNER JOIN agencies ag ON ag.id = a.agency_id
     LEFT JOIN admins creator ON creator.id = a.created_by_admin_id
     WHERE a.role = 'agency_manager' AND a.agency_id = $1 AND a.deleted_at IS NULL
     ORDER BY a.created_at DESC`,
    [admin.agency_id]
  );
  return result.rows;
};

export const createAgencyAccountService = async (
  agencyId: string,
  payload: CreateAgencyAccountPayload,
  superAdminId: string
) => {
  // 1. Kiểm tra agency tồn tại và đang active
  const agencyResult = await pool.query(
    'SELECT id, name, status FROM agencies WHERE id = $1',
    [agencyId]
  );
  const agency = agencyResult.rows[0];
  if (!agency) return { code: 'AGENCY_NOT_FOUND' };
  if (agency.status !== 'active') return { code: 'AGENCY_INACTIVE' };

  // 2. Kiểm tra email trùng (cả admins và driver_accounts, kể cả đã xóa mềm)
  const normalizedEmail = payload.email.trim().toLowerCase();
  const duplicateAdmin = await pool.query(
    'SELECT id FROM admins WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  const duplicateDriver = await pool.query(
    'SELECT id FROM driver_accounts WHERE LOWER(username) = LOWER($1)',
    [normalizedEmail]
  );
  if (duplicateAdmin.rows[0] || duplicateDriver.rows[0]) return { code: 'DUPLICATE_EMAIL' };

  // 3. Hash mật khẩu và tạo tài khoản
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const result = await pool.query(
    `INSERT INTO admins (email, password_hash, full_name, role, agency_id, created_by_admin_id, is_active)
     VALUES ($1, $2, $3, 'agency_manager', $4, $5, TRUE)
     RETURNING id`,
    [normalizedEmail, passwordHash, agency.name, agencyId, superAdminId]
  );

  const created = await getAgencyAccountById(result.rows[0].id);
  return { code: 'SUCCESS', data: created };
};

export const deleteAgencyAccountService = async (accountId: string, admin: AuthAdmin) => {
  // 1. Tìm tài khoản chưa bị xóa
  const existingAccount = await getAgencyAccountById(accountId);
  if (!existingAccount) return { code: 'NOT_FOUND' };

  // 2. Chỉ super_admin được xóa
  if (admin.role !== 'super_admin') {
    return { code: 'FORBIDDEN' };
  }

  // 3. Soft delete — đánh dấu deleted_at thay vì xóa thật
  await pool.query(
    'UPDATE admins SET deleted_at = NOW() WHERE id = $1',
    [accountId]
  );

  return {
    code: 'SUCCESS',
    data: {
      id: existingAccount.id,
      email: existingAccount.email,
      agency_id: existingAccount.agency_id,
      agency_name: existingAccount.agency_name,
    },
  };
};