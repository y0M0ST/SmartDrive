// Thay thế toàn bộ file agency.service.ts

import pool from '../../config/database';

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

type AgencyPayload = {
  code?: string;
  name?: string;
  address?: string | null;
  contact_phone?: string | null;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();
const normalizeName = (name: string) => name.trim();
const normalizePhone = (phone?: string | null) => phone?.trim().replace(/\s+/g, '') || null;

// Query managers của 1 agency
const managersSubquery = `
  (SELECT COALESCE(json_agg(json_build_object(
    'id',         adm.id,
    'full_name',  adm.full_name,
    'email',      adm.email,
    'is_active',  adm.is_active
  ) ORDER BY adm.created_at ASC), '[]')
  FROM admins adm
  WHERE adm.agency_id = a.id
    AND adm.role = 'agency_manager'
    AND adm.deleted_at IS NULL
  ) AS managers
`;

const getAgencyById = async (agencyId: string) => {
  const result = await pool.query(
    `SELECT id, code, name, address, contact_phone, status, created_at, updated_at
     FROM agencies
     WHERE id = $1`,
    [agencyId]
  );
  return result.rows[0];
};

export const listAgenciesService = async (admin: AuthAdmin) => {
  if (admin.role === 'super_admin') {
    // 1. Super admin xem tất cả agencies
    const result = await pool.query(
      `SELECT
         a.id,
         a.code,
         a.name,
         a.address,
         a.contact_phone,
         a.status,
         a.created_at,
         a.updated_at,
         COALESCE((SELECT COUNT(*)::int FROM admins adm WHERE adm.agency_id = a.id AND adm.role = 'agency_manager' AND adm.deleted_at IS NULL), 0) AS manager_count,
         COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
         COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.deleted_at IS NULL), 0) AS vehicle_count,
         ${managersSubquery}
       FROM agencies a
       ORDER BY a.name ASC`
    );
    return result.rows;
  }

  // 2. Agency manager chỉ xem agency của mình
  const result = await pool.query(
    `SELECT
       a.id,
       a.code,
       a.name,
       a.address,
       a.contact_phone,
       a.status,
       a.created_at,
       a.updated_at,
       COALESCE((SELECT COUNT(*)::int FROM admins adm WHERE adm.agency_id = a.id AND adm.role = 'agency_manager' AND adm.deleted_at IS NULL), 0) AS manager_count,
       COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.deleted_at IS NULL), 0) AS vehicle_count,
       ${managersSubquery}
     FROM agencies a
     WHERE a.id = $1
     ORDER BY a.name ASC`,
    [admin.agency_id]
  );
  return result.rows;
};

export const getAgencyByIdService = async (agencyId: string, admin: AuthAdmin) => {
  // 1. agency_manager chỉ xem được agency của mình
  if (admin.role !== 'super_admin' && admin.agency_id !== agencyId) {
    return { code: 'FORBIDDEN' as const };
  }

  // 2. Tìm agency kèm managers
  const result = await pool.query(
    `SELECT
       a.id,
       a.code,
       a.name,
       a.address,
       a.contact_phone,
       a.status,
       a.created_at,
       a.updated_at,
       COALESCE((SELECT COUNT(*)::int FROM admins adm WHERE adm.agency_id = a.id AND adm.role = 'agency_manager' AND adm.deleted_at IS NULL), 0) AS manager_count,
       COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.deleted_at IS NULL), 0) AS vehicle_count,
       ${managersSubquery}
     FROM agencies a
     WHERE a.id = $1`,
    [agencyId]
  );

  const agency = result.rows[0];
  if (!agency) return { code: 'NOT_FOUND' as const };

  return { code: 'SUCCESS' as const, data: agency };
};

export const createAgencyService = async (payload: AgencyPayload) => {
  const code = normalizeCode(payload.code!);
  const name = normalizeName(payload.name!);
  const address = payload.address?.trim() || null;
  const contactPhone = normalizePhone(payload.contact_phone);

  // 1. Kiểm tra mã trùng
  const duplicateCode = await pool.query('SELECT id FROM agencies WHERE UPPER(code) = $1', [code]);
  if (duplicateCode.rows[0]) return { code: 'DUPLICATE_CODE' };

  // 2. Kiểm tra tên trùng
  const duplicateName = await pool.query('SELECT id FROM agencies WHERE LOWER(name) = LOWER($1)', [name]);
  if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' };

  // 3. Tạo agency mới
  const result = await pool.query(
    `INSERT INTO agencies (code, name, address, contact_phone, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, code, name, address, contact_phone, status, created_at, updated_at`,
    [code, name, address, contactPhone]
  );

  return { code: 'SUCCESS', data: { ...result.rows[0], managers: [], manager_count: 0, driver_count: 0, vehicle_count: 0 } };
};

export const updateAgencyService = async (agencyId: string, payload: AgencyPayload) => {
  // 1. Tìm agency
  const existingAgency = await getAgencyById(agencyId);
  if (!existingAgency) return { code: 'NOT_FOUND' };

  const nextCode = payload.code ? normalizeCode(payload.code) : existingAgency.code;
  const nextName = payload.name ? normalizeName(payload.name) : existingAgency.name;

  // 2. Kiểm tra mã trùng
  const duplicateCode = await pool.query(
    'SELECT id FROM agencies WHERE UPPER(code) = $1 AND id <> $2',
    [nextCode, agencyId]
  );
  if (duplicateCode.rows[0]) return { code: 'DUPLICATE_CODE' };

  // 3. Kiểm tra tên trùng
  const duplicateName = await pool.query(
    'SELECT id FROM agencies WHERE LOWER(name) = LOWER($1) AND id <> $2',
    [nextName, agencyId]
  );
  if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' };

  // 4. Cập nhật DB
  await pool.query(
    `UPDATE agencies
     SET code = $1, name = $2, address = $3, contact_phone = $4
     WHERE id = $5`,
    [
      nextCode,
      nextName,
      payload.address === undefined ? existingAgency.address : payload.address?.trim() || null,
      payload.contact_phone === undefined ? existingAgency.contact_phone : normalizePhone(payload.contact_phone),
      agencyId,
    ]
  );

  // 5. Trả về data đầy đủ kèm managers
  const updated = await pool.query(
    `SELECT
       a.id, a.code, a.name, a.address, a.contact_phone, a.status, a.created_at, a.updated_at,
       COALESCE((SELECT COUNT(*)::int FROM admins adm WHERE adm.agency_id = a.id AND adm.role = 'agency_manager' AND adm.deleted_at IS NULL), 0) AS manager_count,
       COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id AND v.deleted_at IS NULL), 0) AS vehicle_count,
       ${managersSubquery}
     FROM agencies a
     WHERE a.id = $1`,
    [agencyId]
  );

  return { code: 'SUCCESS', data: updated.rows[0] };
};

export const deleteAgencyService = async (agencyId: string) => {
  // 1. Tìm agency
  const existingAgency = await getAgencyById(agencyId);
  if (!existingAgency) return { code: 'NOT_FOUND' };

  // 2. Kiểm tra data liên kết
  const linkedDataResult = await pool.query(
    `SELECT
       COALESCE((SELECT COUNT(*)::int FROM admins WHERE agency_id = $1 AND deleted_at IS NULL), 0) AS admin_count,
       COALESCE((SELECT COUNT(*)::int FROM drivers WHERE agency_id = $1), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles WHERE agency_id = $1 AND deleted_at IS NULL), 0) AS vehicle_count`,
    [agencyId]
  );

  const linkedData = linkedDataResult.rows[0];
  if (linkedData.admin_count > 0 || linkedData.driver_count > 0 || linkedData.vehicle_count > 0) {
    return { code: 'AGENCY_HAS_LINKED_DATA', data: { ...existingAgency, ...linkedData } };
  }

  // 3. Xóa agency
  const result = await pool.query(
    `DELETE FROM agencies WHERE id = $1
     RETURNING id, code, name, address, contact_phone, status, created_at, updated_at`,
    [agencyId]
  );

  return { code: 'SUCCESS', data: result.rows[0] };
};