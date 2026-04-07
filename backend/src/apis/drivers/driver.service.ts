import pool from '../../config/database';

type ListDriversOptions = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  agency_id?: string;
  admin: {
    id: string;
    role: string;
    agency_id: string | null;
  };
};

type DriverPayload = {
  full_name?: string;
  phone?: string;
  license_number?: string;
  license_expiry_date?: string;
  license_type?: string;
  face_image_url?: string | null;
  status?: string;
  agency_id?: string;
};

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

type DriverEntity = Record<string, any>;

type AgencyResolutionResult =
  | { code: 'AGENCY_REQUIRED' }
  | { code: 'AGENCY_NOT_FOUND' }
  | { code: 'AGENCY_INACTIVE' }
  | { code: 'SUCCESS'; agencyId: string };

type DriverDetailResult =
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'SUCCESS'; data: DriverEntity };

type DriverWriteResult =
  | { code: 'AGENCY_REQUIRED' }
  | { code: 'AGENCY_NOT_FOUND' }
  | { code: 'AGENCY_INACTIVE' }
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'DUPLICATE_PHONE' }
  | { code: 'DUPLICATE_LICENSE' }
  | { code: 'SUCCESS'; data: DriverEntity | null };

type DriverDeleteResult =
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'DRIVER_HAS_LINKED_DATA' }
  | { code: 'DRIVER_ON_TRIP'; data: DriverEntity }
  | { code: 'SUCCESS'; data: DriverEntity };

const normalizePhone = (phone: string) => phone.trim().replace(/\s+/g, '');
const normalizeLicenseNumber = (licenseNumber: string) => licenseNumber.trim().toUpperCase();
const formatDateOnly = (value: unknown) => {
  if (!value) return value ?? null;

  if (typeof value === 'string') {
    const matchedDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matchedDate) return matchedDate[1];
  }

  const parsedDate = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(parsedDate.getTime())) return value;

  const year = parsedDate.getFullYear();
  const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsedDate.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const serializeDriver = (driver: DriverEntity): DriverEntity => ({
  ...driver,
  license_expiry_date: formatDateOnly(driver.license_expiry_date),
});

const getDriverDetailsById = async (db: QueryExecutor, driverId: string): Promise<DriverEntity | null> => {
  const result = await db.query(
    `SELECT
      d.id,
      d.created_by_admin_id,
      d.agency_id,
      a.name AS agency_name,
      d.full_name,
      d.phone,
      d.license_number,
      d.license_expiry_date,
      d.license_type,
      d.face_image_url,
      d.safety_score,
      d.safety_score_formula,
      d.safety_score_updated_at,
      d.status,
      d.created_at,
      d.updated_at
     FROM drivers d
     LEFT JOIN agencies a ON a.id = d.agency_id
     WHERE d.id = $1`,
    [driverId]
  );

  return result.rows[0] ? serializeDriver(result.rows[0]) : null;
};

const resolveAgencyId = async (payloadAgencyId: string | undefined, admin: AuthAdmin): Promise<AgencyResolutionResult> => {
  const agencyId = admin.role === 'super_admin' ? payloadAgencyId : admin.agency_id;

  if (!agencyId) return { code: 'AGENCY_REQUIRED' as const };

  const agencyResult = await pool.query(
    'SELECT id, status FROM agencies WHERE id = $1',
    [agencyId]
  );
  const agency = agencyResult.rows[0];

  if (!agency) return { code: 'AGENCY_NOT_FOUND' as const };
  if (agency.status !== 'active') return { code: 'AGENCY_INACTIVE' as const };

  return { code: 'SUCCESS' as const, agencyId };
};

export const listDriversService = async ({
  page,
  limit,
  search,
  status,
  agency_id,
  admin,
}: ListDriversOptions) => {
  const offset = (page - 1) * limit;
  const filters: string[] = [];
  const values: Array<string | number> = [];

  if (search) {
    values.push(`%${search.trim()}%`);
    filters.push(`(d.full_name ILIKE $${values.length} OR d.phone ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    filters.push(`d.status = $${values.length}`);
  }

  if (agency_id && admin.role === 'super_admin') {
    values.push(agency_id);
    filters.push(`d.agency_id = $${values.length}`);
  }

  if (admin.role !== 'super_admin') {
    values.push(admin.agency_id as string);
    filters.push(`d.agency_id = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM drivers d ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT
      d.id,
      d.created_by_admin_id,
      d.agency_id,
      a.name AS agency_name,
      d.full_name,
      d.phone,
      d.license_number,
      d.license_expiry_date,
      d.license_type,
      d.face_image_url,
      d.safety_score,
      d.safety_score_formula,
      d.safety_score_updated_at,
      d.status,
      d.created_at,
      d.updated_at
     FROM drivers d
     LEFT JOIN agencies a ON a.id = d.agency_id
     ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return {
    rows: result.rows.map(serializeDriver),
    total: countResult.rows[0].total,
  };
};

export const getDriverByIdService = async (driverId: string, admin: AuthAdmin): Promise<DriverDetailResult> => {
  const driver = await getDriverDetailsById(pool, driverId);
  if (!driver) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && driver.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  return { code: 'SUCCESS', data: driver };
};

export const createDriverService = async (payload: DriverPayload, admin: AuthAdmin): Promise<DriverWriteResult> => {
  const fullName = payload.full_name!.trim();
  const phone = normalizePhone(payload.phone!);
  const licenseNumber = normalizeLicenseNumber(payload.license_number!);
  const licenseExpiryDate = payload.license_expiry_date!;
  const licenseType = payload.license_type!.trim().toUpperCase();
  const faceImageUrl = payload.face_image_url?.trim() || null;
  const status = payload.status?.trim() || 'active';

  const agencyResolution = await resolveAgencyId(payload.agency_id, admin);
  if (agencyResolution.code !== 'SUCCESS') return agencyResolution;

  const duplicatePhone = await pool.query(
    'SELECT id FROM drivers WHERE phone = $1',
    [phone]
  );
  if (duplicatePhone.rows[0]) return { code: 'DUPLICATE_PHONE' };

  const duplicateLicense = await pool.query(
    'SELECT id FROM drivers WHERE UPPER(license_number) = $1',
    [licenseNumber]
  );
  if (duplicateLicense.rows[0]) return { code: 'DUPLICATE_LICENSE' };

  const result = await pool.query(
    `INSERT INTO drivers (
      created_by_admin_id,
      agency_id,
      full_name,
      phone,
      license_number,
      license_expiry_date,
      license_type,
      face_image_url,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      admin.id,
      agencyResolution.agencyId,
      fullName,
      phone,
      licenseNumber,
      licenseExpiryDate,
      licenseType,
      faceImageUrl,
      status,
    ]
  );

  const createdDriver = await getDriverDetailsById(pool, result.rows[0].id);

  return { code: 'SUCCESS', data: createdDriver };
};

export const updateDriverService = async (driverId: string, payload: DriverPayload, admin: AuthAdmin): Promise<DriverWriteResult> => {
  const existingResult = await pool.query(
    'SELECT * FROM drivers WHERE id = $1',
    [driverId]
  );
  const existingDriver = existingResult.rows[0];
  if (!existingDriver) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingDriver.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  const nextPhone = payload.phone ? normalizePhone(payload.phone) : existingDriver.phone;
  const nextLicenseNumber = payload.license_number
    ? normalizeLicenseNumber(payload.license_number)
    : existingDriver.license_number;

  const duplicatePhone = await pool.query(
    'SELECT id FROM drivers WHERE phone = $1 AND id <> $2',
    [nextPhone, driverId]
  );
  if (duplicatePhone.rows[0]) return { code: 'DUPLICATE_PHONE' };

  const duplicateLicense = await pool.query(
    'SELECT id FROM drivers WHERE UPPER(license_number) = $1 AND id <> $2',
    [nextLicenseNumber, driverId]
  );
  if (duplicateLicense.rows[0]) return { code: 'DUPLICATE_LICENSE' };

  let nextAgencyId = existingDriver.agency_id;
  if (admin.role === 'super_admin' && payload.agency_id) {
    const agencyResolution = await resolveAgencyId(payload.agency_id, admin);
    if (agencyResolution.code !== 'SUCCESS') return agencyResolution;
    nextAgencyId = agencyResolution.agencyId;
  }

  const result = await pool.query(
    `UPDATE drivers SET
      agency_id = $1,
      full_name = $2,
      phone = $3,
      license_number = $4,
      license_expiry_date = $5,
      license_type = $6,
      face_image_url = $7,
      status = $8,
      updated_at = NOW()
     WHERE id = $9
     RETURNING id`,
    [
      nextAgencyId,
      payload.full_name?.trim() || existingDriver.full_name,
      nextPhone,
      nextLicenseNumber,
      payload.license_expiry_date || existingDriver.license_expiry_date,
      payload.license_type?.trim().toUpperCase() || existingDriver.license_type,
      payload.face_image_url === undefined
        ? existingDriver.face_image_url
        : payload.face_image_url?.trim() || null,
      payload.status?.trim() || existingDriver.status,
      driverId,
    ]
  );

  const newStatus = payload.status?.trim() || existingDriver.status;
  if (newStatus === 'banned' && existingDriver.status !== 'banned') {
    await pool.query(
      'UPDATE driver_accounts SET is_active = FALSE WHERE driver_id = $1',
      [driverId]
    );
  } else if (newStatus !== 'banned' && existingDriver.status === 'banned') {
    await pool.query(
      'UPDATE driver_accounts SET is_active = TRUE WHERE driver_id = $1',
      [driverId]
    );
  }

  const updatedDriver = await getDriverDetailsById(pool, result.rows[0].id);

  return { code: 'SUCCESS', data: updatedDriver };
};

export const deleteDriverService = async (driverId: string, admin: AuthAdmin): Promise<DriverDeleteResult> => {
  const existingResult = await pool.query(
    'SELECT * FROM drivers WHERE id = $1',
    [driverId]
  );
  const existingDriver = existingResult.rows[0];
  if (!existingDriver) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingDriver.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  if (existingDriver.status === 'on_trip') {
    return { code: 'DRIVER_ON_TRIP', data: existingDriver };
  }

  try {
    const result = await pool.query(
      `DELETE FROM drivers
       WHERE id = $1
       RETURNING id, full_name, agency_id`,
      [driverId]
    );

    return { code: 'SUCCESS', data: result.rows[0] };
  } catch (error: any) {
    if (error?.code === '23503') {
      return { code: 'DRIVER_HAS_LINKED_DATA' };
    }

    throw error;
  }
};