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
  camera_code?: string | null;
};

type AuthAdmin = {
  id: string;
  role: string;
  agency_id: string | null;
};

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

type VehicleEntity = Record<string, any>;
type CameraConflictData = Record<string, any> | undefined;

type AgencyResolutionResult =
  | { code: 'AGENCY_REQUIRED' }
  | { code: 'AGENCY_NOT_FOUND' }
  | { code: 'AGENCY_INACTIVE' }
  | { code: 'SUCCESS'; agencyId: string };

type VehicleDetailResult =
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'SUCCESS'; data: VehicleEntity };

type VehicleWriteResult =
  | { code: 'AGENCY_REQUIRED' }
  | { code: 'AGENCY_NOT_FOUND' }
  | { code: 'AGENCY_INACTIVE' }
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'DUPLICATE_LICENSE_PLATE' }
  | { code: 'DUPLICATE_CAMERA_CODE'; data: CameraConflictData }
  | { code: 'SUCCESS'; data: VehicleEntity | null };

type VehicleDeleteResult =
  | { code: 'NOT_FOUND' }
  | { code: 'FORBIDDEN' }
  | { code: 'VEHICLE_HAS_LINKED_DATA' }
  | { code: 'VEHICLE_ON_TRIP'; data: VehicleEntity }
  | { code: 'SUCCESS'; data: VehicleEntity };

const normalizeLicensePlate = (licensePlate: string) => licensePlate.trim().toUpperCase();
const normalizeCameraCode = (cameraCode: string) => cameraCode.trim();
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

const serializeVehicle = (vehicle: VehicleEntity): VehicleEntity => ({
  ...vehicle,
  camera_code: vehicle.camera_code ?? null,
  registration_expiry_date: formatDateOnly(vehicle.registration_expiry_date),
  insurance_expiry_date: formatDateOnly(vehicle.insurance_expiry_date),
});

const getVehicleDetailsById = async (db: QueryExecutor, vehicleId: string): Promise<VehicleEntity | null> => {
  const result = await db.query(
    `SELECT
      v.id,
      v.agency_id,
      a.name AS agency_name,
      v.license_plate,
      v.brand,
      v.model,
      v.seat_count,
      v.vehicle_type,
      v.status,
      ed.device_token AS camera_code,
      v.registration_expiry_date,
      v.insurance_expiry_date,
      v.created_at,
      v.updated_at
     FROM vehicles v
     LEFT JOIN agencies a ON a.id = v.agency_id
     LEFT JOIN edge_devices ed ON ed.vehicle_id = v.id
     WHERE v.id = $1 AND v.deleted_at IS NULL`,
    [vehicleId]
  );

  return result.rows[0] ? serializeVehicle(result.rows[0]) : null;
};

const findVehicleByCameraCode = async (
  db: QueryExecutor,
  cameraCode: string,
  excludedVehicleId?: string
): Promise<CameraConflictData> => {
  const params: string[] = [cameraCode];
  let query = `SELECT ed.vehicle_id, v.license_plate
               FROM edge_devices ed
               INNER JOIN vehicles v ON v.id = ed.vehicle_id
               WHERE ed.device_token = $1 AND v.deleted_at IS NULL`;

  if (excludedVehicleId) {
    params.push(excludedVehicleId);
    query += ` AND ed.vehicle_id <> $2`;
  }

  const result = await db.query(query, params);
  return result.rows[0];
};

const syncVehicleCamera = async (db: QueryExecutor, vehicleId: string, cameraCode: string | null) => {
  const existingEdgeDeviceResult = await db.query(
    'SELECT id FROM edge_devices WHERE vehicle_id = $1',
    [vehicleId]
  );
  const existingEdgeDevice = existingEdgeDeviceResult.rows[0];

  if (!cameraCode) {
    if (existingEdgeDevice) {
      await db.query('DELETE FROM edge_devices WHERE vehicle_id = $1', [vehicleId]);
    }
    return;
  }

  if (existingEdgeDevice) {
    await db.query(
      `UPDATE edge_devices SET device_token = $1, status = 'active' WHERE vehicle_id = $2`,
      [cameraCode, vehicleId]
    );
    return;
  }

  await db.query(
    `INSERT INTO edge_devices (vehicle_id, device_token, status) VALUES ($1, $2, 'active')`,
    [vehicleId, cameraCode]
  );
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

export const listVehiclesService = async ({
  page,
  limit,
  search,
  status,
  agency_id,
  admin,
}: ListVehiclesOptions) => {
  const offset = (page - 1) * limit;
  const filters: string[] = ['v.deleted_at IS NULL'];
  const values: Array<string | number> = [];

  if (search) {
    values.push(`%${search.trim().toUpperCase()}%`);
    filters.push(`UPPER(v.license_plate) ILIKE $${values.length}`);
  }

  if (status) {
    values.push(status);
    filters.push(`v.status = $${values.length}`);
  }

  if (agency_id && admin.role === 'super_admin') {
    values.push(agency_id);
    filters.push(`v.agency_id = $${values.length}`);
  }

  if (admin.role !== 'super_admin') {
    values.push(admin.agency_id as string);
    filters.push(`v.agency_id = $${values.length}`);
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM vehicles v ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT
      v.id,
      v.agency_id,
      a.name AS agency_name,
      v.license_plate,
      v.brand,
      v.model,
      v.seat_count,
      v.vehicle_type,
      v.status,
      ed.device_token AS camera_code,
      v.registration_expiry_date,
      v.insurance_expiry_date,
      v.created_at,
      v.updated_at
     FROM vehicles v
     LEFT JOIN agencies a ON a.id = v.agency_id
     LEFT JOIN edge_devices ed ON ed.vehicle_id = v.id
     ${whereClause}
     ORDER BY v.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return {
    rows: result.rows.map(serializeVehicle),
    total: countResult.rows[0].total,
  };
};

export const getVehicleByIdService = async (vehicleId: string, admin: AuthAdmin): Promise<VehicleDetailResult> => {
  const vehicle = await getVehicleDetailsById(pool, vehicleId);
  if (!vehicle) return { code: 'NOT_FOUND' };

  if (admin.role !== 'super_admin' && vehicle.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  return { code: 'SUCCESS', data: vehicle };
};

export const createVehicleService = async (payload: VehiclePayload, admin: AuthAdmin): Promise<VehicleWriteResult> => {
  const licensePlate = normalizeLicensePlate(payload.license_plate!);
  const brand = payload.brand!.trim();
  const model = payload.model!.trim();
  const seatCount = Number(payload.seat_count!);
  const vehicleType = payload.vehicle_type!.trim();
  const registrationExpiryDate = payload.registration_expiry_date!;
  const insuranceExpiryDate = payload.insurance_expiry_date!;
  const status = payload.status?.trim() || 'available';
  const cameraCode = typeof payload.camera_code === 'string' && payload.camera_code.trim()
    ? normalizeCameraCode(payload.camera_code)
    : null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const agencyResolution = await resolveAgencyId(payload.agency_id, admin);
    if (agencyResolution.code !== 'SUCCESS') {
      await client.query('ROLLBACK');
      return agencyResolution;
    }

    // Kiểm tra biển số trùng (chỉ check chưa bị xóa)
    const duplicatePlate = await client.query(
      'SELECT id FROM vehicles WHERE UPPER(license_plate) = $1 AND deleted_at IS NULL',
      [licensePlate]
    );
    if (duplicatePlate.rows[0]) {
      await client.query('ROLLBACK');
      return { code: 'DUPLICATE_LICENSE_PLATE' };
    }

    if (cameraCode) {
      const duplicateCamera = await findVehicleByCameraCode(client, cameraCode);
      if (duplicateCamera) {
        await client.query('ROLLBACK');
        return { code: 'DUPLICATE_CAMERA_CODE', data: duplicateCamera };
      }
    }

    const result = await client.query(
      `INSERT INTO vehicles (
        agency_id, license_plate, brand, model, seat_count,
        vehicle_type, registration_expiry_date, insurance_expiry_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        agencyResolution.agencyId, licensePlate, brand, model, seatCount,
        vehicleType, registrationExpiryDate, insuranceExpiryDate, status,
      ]
    );

    if (cameraCode) {
      await syncVehicleCamera(client, result.rows[0].id, cameraCode);
    }

    const createdVehicle = await getVehicleDetailsById(client, result.rows[0].id);
    await client.query('COMMIT');
    return { code: 'SUCCESS', data: createdVehicle };
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23505') {
      if (error?.constraint === 'uq_vehicles_plate') return { code: 'DUPLICATE_LICENSE_PLATE' };
      if (error?.constraint === 'uq_edge_token' && cameraCode) {
        const duplicateCamera = await findVehicleByCameraCode(pool, cameraCode);
        return { code: 'DUPLICATE_CAMERA_CODE', data: duplicateCamera };
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

export const updateVehicleService = async (vehicleId: string, payload: VehiclePayload, admin: AuthAdmin): Promise<VehicleWriteResult> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingVehicle = await getVehicleDetailsById(client, vehicleId);
    if (!existingVehicle) {
      await client.query('ROLLBACK');
      return { code: 'NOT_FOUND' };
    }

    if (admin.role !== 'super_admin' && existingVehicle.agency_id !== admin.agency_id) {
      await client.query('ROLLBACK');
      return { code: 'FORBIDDEN' };
    }

    const nextLicensePlate = payload.license_plate
      ? normalizeLicensePlate(payload.license_plate)
      : existingVehicle.license_plate;

    // Kiểm tra biển số trùng (chỉ check chưa bị xóa)
    const duplicatePlate = await client.query(
      'SELECT id FROM vehicles WHERE UPPER(license_plate) = $1 AND id <> $2 AND deleted_at IS NULL',
      [nextLicensePlate, vehicleId]
    );
    if (duplicatePlate.rows[0]) {
      await client.query('ROLLBACK');
      return { code: 'DUPLICATE_LICENSE_PLATE' };
    }

    let nextAgencyId = existingVehicle.agency_id;
    if (admin.role === 'super_admin' && payload.agency_id) {
      const agencyResolution = await resolveAgencyId(payload.agency_id, admin);
      if (agencyResolution.code !== 'SUCCESS') {
        await client.query('ROLLBACK');
        return agencyResolution;
      }
      nextAgencyId = agencyResolution.agencyId;
    }

    const hasCameraCodeField = Object.prototype.hasOwnProperty.call(payload, 'camera_code');
    const nextCameraCode = hasCameraCodeField
      ? (typeof payload.camera_code === 'string' && payload.camera_code.trim()
        ? normalizeCameraCode(payload.camera_code)
        : null)
      : existingVehicle.camera_code;

    if (hasCameraCodeField && nextCameraCode) {
      const duplicateCamera = await findVehicleByCameraCode(client, nextCameraCode, vehicleId);
      if (duplicateCamera) {
        await client.query('ROLLBACK');
        return { code: 'DUPLICATE_CAMERA_CODE', data: duplicateCamera };
      }
    }

    const result = await client.query(
      `UPDATE vehicles SET
        agency_id = $1, license_plate = $2, brand = $3, model = $4,
        seat_count = $5, vehicle_type = $6, registration_expiry_date = $7,
        insurance_expiry_date = $8, status = $9, updated_at = NOW()
       WHERE id = $10 RETURNING id`,
      [
        nextAgencyId, nextLicensePlate,
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

    if (hasCameraCodeField) {
      await syncVehicleCamera(client, vehicleId, nextCameraCode || null);
    }

    const updatedVehicle = await getVehicleDetailsById(client, result.rows[0].id);
    await client.query('COMMIT');
    return { code: 'SUCCESS', data: updatedVehicle };
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23505') {
      if (error?.constraint === 'uq_vehicles_plate') return { code: 'DUPLICATE_LICENSE_PLATE' };
      if (error?.constraint === 'uq_edge_token' && typeof payload.camera_code === 'string' && payload.camera_code.trim()) {
        const duplicateCamera = await findVehicleByCameraCode(pool, normalizeCameraCode(payload.camera_code), vehicleId);
        return { code: 'DUPLICATE_CAMERA_CODE', data: duplicateCamera };
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

export const deleteVehicleService = async (vehicleId: string, admin: AuthAdmin): Promise<VehicleDeleteResult> => {
  // 1. Tìm xe chưa bị xóa
  const existingVehicle = await getVehicleDetailsById(pool, vehicleId);
  if (!existingVehicle) return { code: 'NOT_FOUND' };

  // 2. Kiểm tra quyền
  if (admin.role !== 'super_admin' && existingVehicle.agency_id !== admin.agency_id) {
    return { code: 'FORBIDDEN' };
  }

  // 3. Không cho xóa xe đang chạy
  if (existingVehicle.status === 'on_trip') {
    return { code: 'VEHICLE_ON_TRIP', data: existingVehicle };
  }

  // 4. Soft delete — đánh dấu deleted_at thay vì xóa thật
  await pool.query(
    'UPDATE vehicles SET deleted_at = NOW() WHERE id = $1',
    [vehicleId]
  );

  return { code: 'SUCCESS', data: existingVehicle };
};