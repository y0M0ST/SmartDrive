import pool from '../../config/database';

type AuthUser = {
  id: string;
  roles: string[];
  agency_id: string | null;
};

type DriverPayload = {
  user_id?: string;
  agency_id?: string;
  full_name?: string;
  phone?: string;
  identity_card?: string;
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  face_encoding?: string | null;
  status?: string;
};

type ListDriversOptions = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  agency_id?: string;
};

const formatDateOnly = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched) return matched[1];
  }
  const d = value instanceof Date ? value : new Date(value as string);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDriverById = async (driverId: string) => {
  const result = await pool.query(
    `SELECT
       d.id, d.user_id, d.agency_id, d.full_name, d.phone,
       d.identity_card, d.license_number, d.license_type, d.license_expiry,
       d.face_encoding, d.status, d.created_at, d.updated_at,
       a.name AS agency_name,
       u.email AS user_email,
       u.username AS user_username
     FROM drivers d
     LEFT JOIN agencies a ON a.id = d.agency_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.id = $1`,
    [driverId]
  );
  if (!result.rows[0]) return null;
  return { ...result.rows[0], license_expiry: formatDateOnly(result.rows[0].license_expiry) };
};

const resolveAgencyId = (payloadAgencyId: string | undefined, currentUser: AuthUser): string | null => {
  return currentUser.roles.includes('super_admin') ? payloadAgencyId || null : currentUser.agency_id;
};

export const listDriversService = async (options: ListDriversOptions, currentUser: AuthUser) => {
  const { page, limit, search, status } = options;
  const offset = (page - 1) * limit;
  const filters: string[] = [];
  const values: any[] = [];

  // Agency manager chỉ xem tài xế trong agency của mình
  if (!currentUser.roles.includes('super_admin')) {
    values.push(currentUser.agency_id);
    filters.push(`d.agency_id = $${values.length}`);
  } else if (options.agency_id) {
    values.push(options.agency_id);
    filters.push(`d.agency_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.trim()}%`);
    filters.push(`(d.full_name ILIKE $${values.length} OR d.phone ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    filters.push(`d.status = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM drivers d ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const result = await pool.query(
    `SELECT
       d.id, d.user_id, d.agency_id, d.full_name, d.phone,
       d.identity_card, d.license_number, d.license_type, d.license_expiry,
       d.status, d.created_at, d.updated_at,
       a.name AS agency_name,
       u.email AS user_email
     FROM drivers d
     LEFT JOIN agencies a ON a.id = d.agency_id
     LEFT JOIN users u ON u.id = d.user_id
     ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );

  return {
    rows: result.rows.map(r => ({ ...r, license_expiry: formatDateOnly(r.license_expiry) })),
    total: countResult.rows[0].total,
  };
};

export const getDriverByIdService = async (driverId: string, currentUser: AuthUser) => {
  const driver = await getDriverById(driverId);
  if (!driver) return { code: 'NOT_FOUND' as const };

  if (!currentUser.roles.includes('super_admin') && driver.agency_id !== currentUser.agency_id) {
    return { code: 'FORBIDDEN' as const };
  }

  return { code: 'SUCCESS' as const, data: driver };
};

export const createDriverService = async (payload: DriverPayload, currentUser: AuthUser) => {
  const agencyId = resolveAgencyId(payload.agency_id, currentUser);
  if (!agencyId) return { code: 'AGENCY_REQUIRED' as const };

  // 1. Kiểm tra agency tồn tại
  const agencyResult = await pool.query('SELECT id FROM agencies WHERE id = $1 AND is_deleted = FALSE', [agencyId]);
  if (!agencyResult.rows[0]) return { code: 'AGENCY_NOT_FOUND' as const };

  // 2. Kiểm tra user_id
  if (payload.user_id) {
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND is_deleted = FALSE', [payload.user_id]);
    if (!userResult.rows[0]) return { code: 'USER_NOT_FOUND' as const };
  }

  // 3. Kiểm tra trùng
  const dupPhone = await pool.query('SELECT id FROM drivers WHERE phone = $1', [payload.phone!.trim()]);
  if (dupPhone.rows[0]) return { code: 'DUPLICATE_PHONE' as const };

  const dupLicense = await pool.query('SELECT id FROM drivers WHERE license_number = UPPER($1)', [payload.license_number!.trim()]);
  if (dupLicense.rows[0]) return { code: 'DUPLICATE_LICENSE' as const };

  const dupIdentity = await pool.query('SELECT id FROM drivers WHERE identity_card = $1', [payload.identity_card!.trim()]);
  if (dupIdentity.rows[0]) return { code: 'DUPLICATE_IDENTITY_CARD' as const };

  // 4. Kiểm tra ngày hết hạn bằng lái
  if (new Date(payload.license_expiry!) < new Date()) {
    return { code: 'PAST_LICENSE_EXPIRY' as const };
  }

  // 5. Tạo driver
  const result = await pool.query(
    `INSERT INTO drivers (user_id, agency_id, full_name, phone, identity_card, license_number, license_type, license_expiry, face_encoding, status)
     VALUES ($1, $2, $3, $4, $5, UPPER($6), $7, $8, $9, 'active')
     RETURNING id`,
    [
      payload.user_id || null,
      agencyId,
      payload.full_name!.trim(),
      payload.phone!.trim(),
      payload.identity_card!.trim(),
      payload.license_number!.trim(),
      payload.license_type!.trim().toUpperCase(),
      payload.license_expiry!,
      payload.face_encoding || null,
    ]
  );

  const created = await getDriverById(result.rows[0].id);
  return { code: 'SUCCESS' as const, data: created };
};

export const updateDriverService = async (driverId: string, payload: DriverPayload, currentUser: AuthUser) => {
  // 1. Tìm driver
  const existing = await getDriverById(driverId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  if (!currentUser.roles.includes('super_admin') && existing.agency_id !== currentUser.agency_id) {
    return { code: 'FORBIDDEN' as const };
  }

  // 2. Kiểm tra trùng phone
  if (payload.phone) {
    const dupPhone = await pool.query('SELECT id FROM drivers WHERE phone = $1 AND id <> $2', [payload.phone.trim(), driverId]);
    if (dupPhone.rows[0]) return { code: 'DUPLICATE_PHONE' as const };
  }

  // 3. Kiểm tra trùng license
  if (payload.license_number) {
    const dupLicense = await pool.query('SELECT id FROM drivers WHERE license_number = UPPER($1) AND id <> $2', [payload.license_number.trim(), driverId]);
    if (dupLicense.rows[0]) return { code: 'DUPLICATE_LICENSE' as const };
  }

  // 4. Kiểm tra status hợp lệ
  const validStatuses = ['active', 'on_trip', 'inactive', 'banned'];
  if (payload.status && !validStatuses.includes(payload.status)) {
    return { code: 'INVALID_STATUS' as const };
  }

  // 5. Cập nhật
  await pool.query(
    `UPDATE drivers SET
       full_name      = COALESCE($1, full_name),
       phone          = COALESCE($2, phone),
       identity_card  = COALESCE($3, identity_card),
       license_number = COALESCE(UPPER($4), license_number),
       license_type   = COALESCE($5, license_type),
       license_expiry = COALESCE($6, license_expiry),
       face_encoding  = COALESCE($7, face_encoding),
       status         = COALESCE($8, status)
     WHERE id = $9`,
    [
      payload.full_name?.trim() || null,
      payload.phone?.trim() || null,
      payload.identity_card?.trim() || null,
      payload.license_number?.trim() || null,
      payload.license_type?.trim().toUpperCase() || null,
      payload.license_expiry || null,
      payload.face_encoding || null,
      payload.status || null,
      driverId,
    ]
  );

  const updated = await getDriverById(driverId);
  return { code: 'SUCCESS' as const, data: updated };
};

export const deleteDriverService = async (driverId: string, currentUser: AuthUser) => {
  // 1. Tìm driver
  const existing = await getDriverById(driverId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  if (!currentUser.roles.includes('super_admin') && existing.agency_id !== currentUser.agency_id) {
    return { code: 'FORBIDDEN' as const };
  }

  // 2. Không cho xóa khi đang on_trip
  if (existing.status === 'on_trip') return { code: 'DRIVER_ON_TRIP' as const };

  // 3. Soft delete qua status inactive
  await pool.query('UPDATE drivers SET status = $1 WHERE id = $2', ['inactive', driverId]);

  return { code: 'SUCCESS' as const, data: { id: existing.id, full_name: existing.full_name } };
};