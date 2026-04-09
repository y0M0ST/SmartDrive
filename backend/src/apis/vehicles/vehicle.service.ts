import pool from '../../config/database';

type AuthUser = {
  id: string;
  roles: string[];
  agency_id: string | null;
};

type VehiclePayload = {
  agency_id?: string;
  plate_number?: string;
  model?: string;
  type?: string;
  capacity?: number;
  status?: string;
  camera_code?: string | null;
};

type ListVehiclesOptions = {
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
  return null;
};

const getVehicleById = async (vehicleId: string) => {
  const result = await pool.query(
    `SELECT
       v.id, v.agency_id, v.plate_number, v.model, v.type, v.capacity,
       v.status, v.is_deleted, v.created_at, v.updated_at,
       a.name AS agency_name,
       d.device_code AS camera_code
     FROM vehicles v
     LEFT JOIN agencies a ON a.id = v.agency_id
     LEFT JOIN devices d ON d.vehicle_id = v.id
     WHERE v.id = $1 AND v.is_deleted = FALSE`,
    [vehicleId]
  );
  return result.rows[0] || null;
};

const syncCamera = async (vehicleId: string, cameraCode: string | null) => {
  const existing = await pool.query('SELECT id FROM devices WHERE vehicle_id = $1', [vehicleId]);

  if (!cameraCode) {
    if (existing.rows[0]) await pool.query('DELETE FROM devices WHERE vehicle_id = $1', [vehicleId]);
    return;
  }

  if (existing.rows[0]) {
    await pool.query('UPDATE devices SET device_code = $1 WHERE vehicle_id = $2', [cameraCode.trim(), vehicleId]);
  } else {
    await pool.query('INSERT INTO devices (vehicle_id, device_code) VALUES ($1, $2)', [vehicleId, cameraCode.trim()]);
  }
};

export const listVehiclesService = async (options: ListVehiclesOptions, currentUser: AuthUser) => {
  const { page, limit, search, status } = options;
  const offset = (page - 1) * limit;
  const filters: string[] = ['v.is_deleted = FALSE'];
  const values: any[] = [];

  if (!currentUser.roles.includes('super_admin')) {
    values.push(currentUser.agency_id);
    filters.push(`v.agency_id = $${values.length}`);
  } else if (options.agency_id) {
    values.push(options.agency_id);
    filters.push(`v.agency_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.trim().toUpperCase()}%`);
    filters.push(`UPPER(v.plate_number) ILIKE $${values.length}`);
  }

  if (status) {
    values.push(status);
    filters.push(`v.status = $${values.length}`);
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM vehicles v ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const result = await pool.query(
    `SELECT
       v.id, v.agency_id, v.plate_number, v.model, v.type, v.capacity,
       v.status, v.created_at, v.updated_at,
       a.name AS agency_name,
       d.device_code AS camera_code
     FROM vehicles v
     LEFT JOIN agencies a ON a.id = v.agency_id
     LEFT JOIN devices d ON d.vehicle_id = v.id
     ${whereClause}
     ORDER BY v.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );

  return { rows: result.rows, total: countResult.rows[0].total };
};

export const getVehicleByIdService = async (vehicleId: string, currentUser: AuthUser) => {
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return { code: 'NOT_FOUND' as const };

  if (!currentUser.roles.includes('super_admin') && vehicle.agency_id !== currentUser.agency_id) {
    return { code: 'FORBIDDEN' as const };
  }

  return { code: 'SUCCESS' as const, data: vehicle };
};

export const createVehicleService = async (payload: VehiclePayload, currentUser: AuthUser) => {
  const agencyId = currentUser.roles.includes('super_admin') ? payload.agency_id : currentUser.agency_id;
  if (!agencyId) return { code: 'AGENCY_REQUIRED' as const };

  const agencyResult = await pool.query('SELECT id FROM agencies WHERE id = $1 AND is_deleted = FALSE', [agencyId]);
  if (!agencyResult.rows[0]) return { code: 'AGENCY_NOT_FOUND' as const };

  const platNumber = payload.plate_number!.trim().toUpperCase();
  const dupPlate = await pool.query(
    'SELECT id FROM vehicles WHERE UPPER(plate_number) = $1 AND is_deleted = FALSE',
    [platNumber]
  );
  if (dupPlate.rows[0]) return { code: 'DUPLICATE_PLATE' as const };

  if (payload.camera_code) {
    const dupCamera = await pool.query(
      `SELECT d.vehicle_id, v.plate_number FROM devices d
       INNER JOIN vehicles v ON v.id = d.vehicle_id
       WHERE d.device_code = $1 AND v.is_deleted = FALSE`,
      [payload.camera_code.trim()]
    );
    if (dupCamera.rows[0]) return { code: 'DUPLICATE_CAMERA_CODE' as const, data: dupCamera.rows[0] };
  }

  const result = await pool.query(
    `INSERT INTO vehicles (agency_id, plate_number, model, type, capacity, status)
     VALUES ($1, $2, $3, $4, $5, 'available')
     RETURNING id`,
    [agencyId, platNumber, payload.model?.trim() || null, payload.type?.trim() || null, payload.capacity || null]
  );

  if (payload.camera_code) {
    await syncCamera(result.rows[0].id, payload.camera_code);
  }

  const created = await getVehicleById(result.rows[0].id);
  return { code: 'SUCCESS' as const, data: created };
};

export const updateVehicleService = async (vehicleId: string, payload: VehiclePayload, currentUser: AuthUser) => {
  const existing = await getVehicleById(vehicleId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  if (!currentUser.roles.includes('super_admin') && existing.agency_id !== currentUser.agency_id) {
    return { code: 'FORBIDDEN' as const };
  }

  if (payload.plate_number) {
    const platNumber = payload.plate_number.trim().toUpperCase();
    const dupPlate = await pool.query(
      'SELECT id FROM vehicles WHERE UPPER(plate_number) = $1 AND id <> $2 AND is_deleted = FALSE',
      [platNumber, vehicleId]
    );
    if (dupPlate.rows[0]) return { code: 'DUPLICATE_PLATE' as const };
  }

  const hasCameraField = Object.prototype.hasOwnProperty.call(payload, 'camera_code');
  if (hasCameraField && payload.camera_code) {
    const dupCamera = await pool.query(
      `SELECT d.vehicle_id, v.plate_number FROM devices d
       INNER JOIN vehicles v ON v.id = d.vehicle_id
       WHERE d.device_code = $1 AND d.vehicle_id <> $2 AND v.is_deleted = FALSE`,
      [payload.camera_code.trim(), vehicleId]
    );
    if (dupCamera.rows[0]) return { code: 'DUPLICATE_CAMERA_CODE' as const, data: dupCamera.rows[0] };
  }

  const validStatuses = ['available', 'on_trip', 'maintenance', 'retired'];
  if (payload.status && !validStatuses.includes(payload.status)) {
    return { code: 'INVALID_STATUS' as const };
  }

  await pool.query(
    `UPDATE vehicles SET
       plate_number = COALESCE(UPPER($1), plate_number),
       model        = COALESCE($2, model),
       type         = COALESCE($3, type),
       capacity     = COALESCE($4, capacity),
       status       = COALESCE($5, status)
     WHERE id = $6`,
    [
      payload.plate_number?.trim() || null,
      payload.model?.trim() || null,
      payload.type?.trim() || null,
      payload.capacity || null,
      payload.status || null,
      vehicleId,
    ]
  );

  if (hasCameraField) {
    await syncCamera(vehicleId, payload.camera_code || null);
  }

  const updated = await getVehicleById(vehicleId);
  return { code: 'SUCCESS' as const, data: updated };
};

export const deleteVehicleService = async (vehicleId: string, currentUser: AuthUser) => {
  const existing = await getVehicleById(vehicleId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  if (!currentUser.roles.includes('super_admin') && existing.agency_id !== currentUser.agency_id) {
    return { code: 'FORBIDDEN' as const };
  }

  if (existing.status === 'on_trip') return { code: 'VEHICLE_ON_TRIP' as const };

  await pool.query('UPDATE vehicles SET is_deleted = TRUE WHERE id = $1', [vehicleId]);

  return { code: 'SUCCESS' as const, data: { id: existing.id, plate_number: existing.plate_number } };
};