import pool from '../../config/database';

type ListVehiclesOptions = {
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

type VehiclePayload = {
  license_plate?: string;
  brand?: string;
  model?: string;
  seat_count?: number;
  vehicle_type?: string;
  registration_expiry_date?: string;
  insurance_expiry_date?: string;
  status?: string;
  agency_id?: string;
};

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

const normalizeLicensePlate = (licensePlate: string) => licensePlate.trim().toUpperCase();

const resolveAgencyId = async (payloadAgencyId: string | undefined, admin: AuthAdmin) => {
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

export const listVehiclesService = async ({
  page,
  limit,
  search,
  status,
  agency_id,
  admin,
}: ListVehiclesOptions) => {
  const offset = (page - 1) * limit;
  const filters: string[] = [];
  const values: Array<string | number> = [];

  if (search) {
    values.push(`%${search.trim().toUpperCase()}%`);
    filters.push(`UPPER(license_plate) ILIKE $${values.length}`);
  }

  if (status) {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }

  if (agency_id && admin.role === 'super_admin') {
    values.push(agency_id);
    filters.push(`agency_id = $${values.length}`);
  }

  if (admin.role !== 'super_admin') {
    values.push(admin.agency_id as string);
    filters.push(`agency_id = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM vehicles ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT
      id,
      agency_id,
      license_plate,
      brand,
      model,
      seat_count,
      vehicle_type,
      status,
      (SELECT name FROM agencies WHERE agencies.id = vehicles.agency_id) AS agency_name,
      registration_expiry_date,
      insurance_expiry_date,
      created_at,
      updated_at
     FROM vehicles
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0].total,
  };
};

export const createVehicleService = async (payload: VehiclePayload, admin: AuthAdmin) => {
  const licensePlate = normalizeLicensePlate(payload.license_plate!);
  const brand = payload.brand!.trim();
  const model = payload.model!.trim();
  const seatCount = Number(payload.seat_count!);
  const vehicleType = payload.vehicle_type!.trim();
  const registrationExpiryDate = payload.registration_expiry_date!;
  const insuranceExpiryDate = payload.insurance_expiry_date!;
  const status = payload.status?.trim() || 'available';

  const agencyResolution = await resolveAgencyId(payload.agency_id, admin);
  if (agencyResolution.code !== 'SUCCESS') return agencyResolution;

  const duplicatePlate = await pool.query(
    'SELECT id FROM vehicles WHERE UPPER(license_plate) = $1',
    [licensePlate]
  );
  if (duplicatePlate.rows[0]) return { code: 'DUPLICATE_LICENSE_PLATE' };

  const result = await pool.query(
    `INSERT INTO vehicles (
      agency_id,
      license_plate,
      brand,
      model,
      seat_count,
      vehicle_type,
      registration_expiry_date,
      insurance_expiry_date,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      agencyResolution.agencyId,
      licensePlate,
      brand,
      model,
      seatCount,
      vehicleType,
      registrationExpiryDate,
      insuranceExpiryDate,
      status,
    ]
  );

  return { code: 'SUCCESS', data: result.rows[0] };
};

export const updateVehicleService = async (vehicleId: string, payload: VehiclePayload, admin: AuthAdmin) => {
  const existingResult = await pool.query(
    'SELECT * FROM vehicles WHERE id = $1',
    [vehicleId]
  );
  const existingVehicle = existingResult.rows[0];
  if (!existingVehicle) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingVehicle.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  const nextLicensePlate = payload.license_plate
    ? normalizeLicensePlate(payload.license_plate)
    : existingVehicle.license_plate;

  const duplicatePlate = await pool.query(
    'SELECT id FROM vehicles WHERE UPPER(license_plate) = $1 AND id <> $2',
    [nextLicensePlate, vehicleId]
  );
  if (duplicatePlate.rows[0]) return { code: 'DUPLICATE_LICENSE_PLATE' };

  let nextAgencyId = existingVehicle.agency_id;
  if (admin.role === 'super_admin' && payload.agency_id) {
    const agencyResolution = await resolveAgencyId(payload.agency_id, admin);
    if (agencyResolution.code !== 'SUCCESS') return agencyResolution;
    nextAgencyId = agencyResolution.agencyId;
  }

  const result = await pool.query(
    `UPDATE vehicles SET
      agency_id = $1,
      license_plate = $2,
      brand = $3,
      model = $4,
      seat_count = $5,
      vehicle_type = $6,
      registration_expiry_date = $7,
      insurance_expiry_date = $8,
      status = $9
     WHERE id = $10
     RETURNING *`,
    [
      nextAgencyId,
      nextLicensePlate,
      payload.brand?.trim() || existingVehicle.brand,
      payload.model?.trim() || existingVehicle.model,
      payload.seat_count === undefined ? existingVehicle.seat_count : Number(payload.seat_count),
      payload.vehicle_type?.trim() || existingVehicle.vehicle_type,
      payload.registration_expiry_date || existingVehicle.registration_expiry_date,
      payload.insurance_expiry_date || existingVehicle.insurance_expiry_date,
      payload.status?.trim() || existingVehicle.status,
      vehicleId,
    ]
  );

  return { code: 'SUCCESS', data: result.rows[0] };
};

export const deleteVehicleService = async (vehicleId: string, admin: AuthAdmin) => {
  const existingResult = await pool.query(
    'SELECT * FROM vehicles WHERE id = $1',
    [vehicleId]
  );
  const existingVehicle = existingResult.rows[0];
  if (!existingVehicle) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && existingVehicle.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  if (existingVehicle.status === 'on_trip') {
    return { code: 'VEHICLE_ON_TRIP', data: existingVehicle };
  }

  try {
    const result = await pool.query(
      `DELETE FROM vehicles
       WHERE id = $1
       RETURNING id, license_plate, agency_id`,
      [vehicleId]
    );

    return { code: 'SUCCESS', data: result.rows[0] };
  } catch (error: any) {
    if (error?.code === '23503') {
      return { code: 'VEHICLE_HAS_LINKED_DATA' };
    }

    throw error;
  }
};