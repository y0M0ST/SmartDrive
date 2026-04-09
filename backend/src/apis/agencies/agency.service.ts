import pool from '../../config/database';

type AuthUser = {
  id: string;
  roles: string[];
  agency_id: string | null;
};

type AgencyPayload = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  user_id?: string;
};

const getAgencyById = async (agencyId: string) => {
  const result = await pool.query(
    `SELECT
       a.id, a.user_id, a.name, a.address, a.phone, a.is_deleted,
       a.created_at, a.updated_at,
       u.username AS manager_username,
       u.email AS manager_email,
       COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.is_deleted = FALSE), 0) AS vehicle_count
     FROM agencies a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.id = $1 AND a.is_deleted = FALSE`,
    [agencyId]
  );
  return result.rows[0];
};

export const listAgenciesService = async (currentUser: AuthUser) => {
  if (currentUser.roles.includes('super_admin')) {
    // 1. Super admin xem tất cả agencies
    const result = await pool.query(
      `SELECT
         a.id, a.user_id, a.name, a.address, a.phone,
         a.created_at, a.updated_at,
         u.username AS manager_username,
         u.email AS manager_email,
         COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
         COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.is_deleted = FALSE), 0) AS vehicle_count
       FROM agencies a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.is_deleted = FALSE
       ORDER BY a.name ASC`
    );
    return result.rows;
  }

  // 2. Agency manager chỉ xem agency của mình
  const result = await pool.query(
    `SELECT
       a.id, a.user_id, a.name, a.address, a.phone,
       a.created_at, a.updated_at,
       u.username AS manager_username,
       u.email AS manager_email,
       COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.is_deleted = FALSE), 0) AS vehicle_count
     FROM agencies a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.id = $1 AND a.is_deleted = FALSE`,
    [currentUser.agency_id]
  );
  return result.rows;
};

export const getAgencyByIdService = async (agencyId: string, currentUser: AuthUser) => {
  // 1. Agency manager chỉ xem agency của mình
  if (!currentUser.roles.includes('super_admin') && currentUser.agency_id !== agencyId) {
    return { code: 'FORBIDDEN' as const };
  }

  const agency = await getAgencyById(agencyId);
  if (!agency) return { code: 'NOT_FOUND' as const };

  return { code: 'SUCCESS' as const, data: agency };
};

export const createAgencyService = async (payload: AgencyPayload) => {
  const name = payload.name!.trim();
  const address = payload.address?.trim() || null;
  const phone = payload.phone?.trim().replace(/\s+/g, '') || null;

  // 1. Kiểm tra tên trùng
  const duplicateName = await pool.query(
    'SELECT id FROM agencies WHERE LOWER(name) = LOWER($1) AND is_deleted = FALSE',
    [name]
  );
  if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' as const };

  // 2. Kiểm tra user_id hợp lệ nếu có
  if (payload.user_id) {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND is_deleted = FALSE',
      [payload.user_id]
    );
    if (!userResult.rows[0]) return { code: 'USER_NOT_FOUND' as const };
  }

  // 3. Tạo agency
  const result = await pool.query(
    `INSERT INTO agencies (user_id, name, address, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [payload.user_id || null, name, address, phone]
  );

  const created = await getAgencyById(result.rows[0].id);
  return { code: 'SUCCESS' as const, data: created };
};

export const updateAgencyService = async (agencyId: string, payload: AgencyPayload) => {
  // 1. Tìm agency
  const existing = await getAgencyById(agencyId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  // 2. Kiểm tra tên trùng
  if (payload.name) {
    const duplicateName = await pool.query(
      'SELECT id FROM agencies WHERE LOWER(name) = LOWER($1) AND id <> $2 AND is_deleted = FALSE',
      [payload.name.trim(), agencyId]
    );
    if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' as const };
  }

  // 3. Cập nhật
  await pool.query(
    `UPDATE agencies SET
       name    = COALESCE($1, name),
       address = $2,
       phone   = $3,
       user_id = COALESCE($4, user_id)
     WHERE id = $5`,
    [
      payload.name?.trim() || null,
      payload.address === undefined ? existing.address : payload.address?.trim() || null,
      payload.phone === undefined ? existing.phone : payload.phone?.trim().replace(/\s+/g, '') || null,
      payload.user_id || null,
      agencyId,
    ]
  );

  const updated = await getAgencyById(agencyId);
  return { code: 'SUCCESS' as const, data: updated };
};

export const deleteAgencyService = async (agencyId: string) => {
  // 1. Tìm agency
  const existing = await getAgencyById(agencyId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  // 2. Kiểm tra còn linked data không
  if (existing.driver_count > 0 || existing.vehicle_count > 0) {
    return { code: 'AGENCY_HAS_LINKED_DATA' as const, data: existing };
  }

  // 3. Soft delete
  await pool.query('UPDATE agencies SET is_deleted = TRUE WHERE id = $1', [agencyId]);

  return { code: 'SUCCESS' as const, data: { id: existing.id, name: existing.name } };
};