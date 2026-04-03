import pool from '../../config/database';
import bcrypt from 'bcryptjs';

type ListAdminsOptions = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  agency_id?: string;
  is_active?: string;
  admin: AuthAdmin;
};

type AdminPayload = {
  email?: string;
  full_name?: string;
  phone?: string;
  role?: string;
  agency_id?: string | null;
  is_active?: boolean;
  password?: string;
};

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

const DEFAULT_PASSWORD = 'SmartDrive@2026';
const BCRYPT_ROUNDS = 10;

// ============================================================
// LIST
// ============================================================
export const listAdminsService = async ({
  page,
  limit,
  search,
  role,
  agency_id,
  is_active,
  admin,
}: ListAdminsOptions) => {
  const offset = (page - 1) * limit;
  const filters: string[] = [];
  const values: Array<string | number | boolean> = [];

  // agency_manager chỉ xem được chính mình
  if (admin.role === 'agency_manager') {
    values.push(admin.id);
    filters.push(`a.id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.trim()}%`);
    filters.push(`(a.full_name ILIKE $${values.length} OR a.email ILIKE $${values.length})`);
  }

  if (role && admin.role === 'super_admin') {
    values.push(role);
    filters.push(`a.role = $${values.length}`);
  }

  if (agency_id && admin.role === 'super_admin') {
    values.push(agency_id);
    filters.push(`a.agency_id = $${values.length}`);
  }

  if (is_active !== undefined) {
    values.push(is_active === 'true');
    filters.push(`a.is_active = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM admins a ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT
      a.id,
      a.email,
      a.full_name,
      a.role,
      a.agency_id,
      ag.name  AS agency_name,
      ag.code  AS agency_code,
      a.is_active,
      a.created_by_admin_id,
      a.created_at,
      a.updated_at
     FROM admins a
     LEFT JOIN agencies ag ON ag.id = a.agency_id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0].total,
  };
};

// ============================================================
// GET BY ID
// ============================================================
export const getAdminByIdService = async (targetId: string, admin: AuthAdmin) => {
  // agency_manager chỉ được xem chính mình
  if (admin.role === 'agency_manager' && targetId !== admin.id) {
    return { code: 'FORBIDDEN' as const };
  }

  const result = await pool.query(
    `SELECT
      a.id,
      a.email,
      a.full_name,
      a.role,
      a.agency_id,
      ag.name AS agency_name,
      ag.code AS agency_code,
      a.is_active,
      a.created_by_admin_id,
      a.created_at,
      a.updated_at
     FROM admins a
     LEFT JOIN agencies ag ON ag.id = a.agency_id
     WHERE a.id = $1`,
    [targetId]
  );

  if (!result.rows[0]) return { code: 'NOT_FOUND' as const };
  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

// ============================================================
// CREATE  (chỉ super_admin)
// ============================================================
export const createAdminService = async (payload: AdminPayload, admin: AuthAdmin) => {
  const email    = payload.email!.trim().toLowerCase();
  const fullName = payload.full_name!.trim();
  const role     = payload.role! as 'super_admin' | 'agency_manager';
  const agencyId = payload.agency_id ?? null;

  // Validate agency_id bắt buộc với agency_manager
  if (role === 'agency_manager') {
    if (!agencyId) return { code: 'AGENCY_REQUIRED' as const };

    const agencyResult = await pool.query(
      'SELECT id, status FROM agencies WHERE id = $1',
      [agencyId]
    );
    const agency = agencyResult.rows[0];
    if (!agency) return { code: 'AGENCY_NOT_FOUND' as const };
    if (agency.status !== 'active') return { code: 'AGENCY_INACTIVE' as const };
  }

  // super_admin không được có agency_id
  if (role === 'super_admin' && agencyId) {
    return { code: 'SUPER_ADMIN_NO_AGENCY' as const };
  }

  // Check email trùng
  const duplicate = await pool.query(
    'SELECT id FROM admins WHERE email = $1',
    [email]
  );
  if (duplicate.rows[0]) return { code: 'DUPLICATE_EMAIL' as const };

  const rawPassword   = payload.password?.trim() || DEFAULT_PASSWORD;
  const passwordHash  = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

  // created_by_admin_id chỉ set cho agency_manager
  const createdBy = role === 'agency_manager' ? admin.id : null;

  const result = await pool.query(
    `INSERT INTO admins (
      email, password_hash, full_name, role, agency_id, created_by_admin_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, full_name, role, agency_id, is_active, created_by_admin_id, created_at, updated_at`,
    [email, passwordHash, fullName, role, agencyId, createdBy]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

// ============================================================
// UPDATE
// ============================================================
export const updateAdminService = async (
  targetId: string,
  payload: AdminPayload,
  admin: AuthAdmin
) => {
  const existingResult = await pool.query(
    'SELECT * FROM admins WHERE id = $1',
    [targetId]
  );
  const existing = existingResult.rows[0];
  if (!existing) return { code: 'NOT_FOUND' as const };

  // agency_manager chỉ được sửa chính mình (và chỉ được sửa full_name)
  if (admin.role === 'agency_manager') {
    if (targetId !== admin.id) return { code: 'FORBIDDEN' as const };
    // Chỉ cho phép sửa full_name
    const allowedForManager = ['full_name'];
    const hasDisallowed = Object.keys(payload).some(
      (k) => !allowedForManager.includes(k)
    );
    if (hasDisallowed) return { code: 'FORBIDDEN' as const };
  }

  // Không cho đổi role của chính mình
  if (payload.role && targetId === admin.id) {
    return { code: 'CANNOT_CHANGE_OWN_ROLE' as const };
  }

  // Không cho tự lock chính mình
  if (payload.is_active === false && targetId === admin.id) {
    return { code: 'CANNOT_DEACTIVATE_SELF' as const };
  }

  const nextEmail    = payload.email?.trim().toLowerCase() ?? existing.email;
  const nextFullName = payload.full_name?.trim()           ?? existing.full_name;
  const nextRole     = payload.role                        ?? existing.role;
  const nextIsActive = payload.is_active                   ?? existing.is_active;
  let   nextAgencyId = existing.agency_id;

  // Validate email trùng
  if (payload.email) {
    const duplicate = await pool.query(
      'SELECT id FROM admins WHERE email = $1 AND id <> $2',
      [nextEmail, targetId]
    );
    if (duplicate.rows[0]) return { code: 'DUPLICATE_EMAIL' as const };
  }

  // Xử lý agency_id khi đổi role hoặc cập nhật agency
  if (payload.agency_id !== undefined || payload.role) {
    nextAgencyId = payload.agency_id ?? (nextRole === 'agency_manager' ? existing.agency_id : null);

    if (nextRole === 'agency_manager') {
      if (!nextAgencyId) return { code: 'AGENCY_REQUIRED' as const };

      const agencyResult = await pool.query(
        'SELECT id, status FROM agencies WHERE id = $1',
        [nextAgencyId]
      );
      const agency = agencyResult.rows[0];
      if (!agency) return { code: 'AGENCY_NOT_FOUND' as const };
      if (agency.status !== 'active') return { code: 'AGENCY_INACTIVE' as const };
    }

    if (nextRole === 'super_admin') nextAgencyId = null;
  }

  const result = await pool.query(
    `UPDATE admins SET
      email      = $1,
      full_name  = $2,
      role       = $3,
      agency_id  = $4,
      is_active  = $5
     WHERE id = $6
     RETURNING id, email, full_name, role, agency_id, is_active, created_by_admin_id, created_at, updated_at`,
    [nextEmail, nextFullName, nextRole, nextAgencyId, nextIsActive, targetId]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

// ============================================================
// DELETE  (chỉ super_admin, không tự xóa mình)
// ============================================================
export const deleteAdminService = async (targetId: string, admin: AuthAdmin) => {
  if (targetId === admin.id) {
    return { code: 'CANNOT_DELETE_SELF' as const };
  }

  const existingResult = await pool.query(
    'SELECT id, full_name, role FROM admins WHERE id = $1',
    [targetId]
  );
  const existing = existingResult.rows[0];
  if (!existing) return { code: 'NOT_FOUND' as const };

  try {
    const result = await pool.query(
      `DELETE FROM admins WHERE id = $1
       RETURNING id, email, full_name, role`,
      [targetId]
    );
    return { code: 'SUCCESS' as const, data: result.rows[0] };
  } catch (error: any) {
    if (error?.code === '23503') {
      return { code: 'ADMIN_HAS_LINKED_DATA' as const };
    }
    throw error;
  }
};