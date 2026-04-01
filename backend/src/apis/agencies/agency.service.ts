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
         COALESCE((SELECT COUNT(*)::int FROM admins adm WHERE adm.agency_id = a.id AND adm.role = 'agency_manager'), 0) AS manager_count,
         COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
         COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id), 0) AS vehicle_count
       FROM agencies a
       ORDER BY name ASC`
    );

    return result.rows;
  }

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
       COALESCE((SELECT COUNT(*)::int FROM admins adm WHERE adm.agency_id = a.id AND adm.role = 'agency_manager'), 0) AS manager_count,
       COALESCE((SELECT COUNT(*)::int FROM drivers d WHERE d.agency_id = a.id), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles v WHERE v.agency_id = a.id), 0) AS vehicle_count
     FROM agencies a
     WHERE a.id = $1
     ORDER BY a.name ASC`,
    [admin.agency_id]
  );

  return result.rows;
};

export const createAgencyService = async (payload: AgencyPayload) => {
  const code = normalizeCode(payload.code!);
  const name = normalizeName(payload.name!);
  const address = payload.address?.trim() || null;
  const contactPhone = normalizePhone(payload.contact_phone);

  const duplicateCode = await pool.query('SELECT id FROM agencies WHERE UPPER(code) = $1', [code]);
  if (duplicateCode.rows[0]) return { code: 'DUPLICATE_CODE' };

  const duplicateName = await pool.query('SELECT id FROM agencies WHERE LOWER(name) = LOWER($1)', [name]);
  if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' };

  const result = await pool.query(
    `INSERT INTO agencies (code, name, address, contact_phone, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, code, name, address, contact_phone, status, created_at, updated_at`,
    [code, name, address, contactPhone]
  );

  return { code: 'SUCCESS', data: result.rows[0] };
};

export const updateAgencyService = async (agencyId: string, payload: AgencyPayload) => {
  const existingAgency = await getAgencyById(agencyId);
  if (!existingAgency) return { code: 'NOT_FOUND' };

  const nextCode = payload.code ? normalizeCode(payload.code) : existingAgency.code;
  const nextName = payload.name ? normalizeName(payload.name) : existingAgency.name;

  const duplicateCode = await pool.query(
    'SELECT id FROM agencies WHERE UPPER(code) = $1 AND id <> $2',
    [nextCode, agencyId]
  );
  if (duplicateCode.rows[0]) return { code: 'DUPLICATE_CODE' };

  const duplicateName = await pool.query(
    'SELECT id FROM agencies WHERE LOWER(name) = LOWER($1) AND id <> $2',
    [nextName, agencyId]
  );
  if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' };

  const result = await pool.query(
    `UPDATE agencies
     SET code = $1,
         name = $2,
         address = $3,
         contact_phone = $4
     WHERE id = $5
     RETURNING id, code, name, address, contact_phone, status, created_at, updated_at`,
    [
      nextCode,
      nextName,
      payload.address === undefined ? existingAgency.address : payload.address?.trim() || null,
      payload.contact_phone === undefined ? existingAgency.contact_phone : normalizePhone(payload.contact_phone),
      agencyId,
    ]
  );

  return { code: 'SUCCESS', data: result.rows[0] };
};

export const deleteAgencyService = async (agencyId: string) => {
  const existingAgency = await getAgencyById(agencyId);
  if (!existingAgency) return { code: 'NOT_FOUND' };

  const linkedDataResult = await pool.query(
    `SELECT
       COALESCE((SELECT COUNT(*)::int FROM admins WHERE agency_id = $1), 0) AS admin_count,
       COALESCE((SELECT COUNT(*)::int FROM drivers WHERE agency_id = $1), 0) AS driver_count,
       COALESCE((SELECT COUNT(*)::int FROM vehicles WHERE agency_id = $1), 0) AS vehicle_count`,
    [agencyId]
  );

  const linkedData = linkedDataResult.rows[0];
  if (linkedData.admin_count > 0 || linkedData.driver_count > 0 || linkedData.vehicle_count > 0) {
    return { code: 'AGENCY_HAS_LINKED_DATA', data: { ...existingAgency, ...linkedData } };
  }

  const result = await pool.query(
    `DELETE FROM agencies
     WHERE id = $1
     RETURNING id, code, name, address, contact_phone, status, created_at, updated_at`,
    [agencyId]
  );

  return { code: 'SUCCESS', data: result.rows[0] };
};