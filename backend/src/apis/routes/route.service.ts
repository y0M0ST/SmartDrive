import pool from '../../config/database';

type ListRoutesOptions = {
  page: number;
  limit: number;
  search?: string;
  is_active?: string;
};

type RoutePayload = {
  name?: string;
  origin?: string;
  destination?: string;
  distance_km?: number | null;
  estimated_duration_min?: number | null;
  is_active?: boolean;
};

// ============================================================
// LIST
// ============================================================
export const listRoutesService = async ({
  page,
  limit,
  search,
  is_active,
}: ListRoutesOptions) => {
  const offset  = (page - 1) * limit;
  const filters: string[] = [];
  const values:  Array<string | number | boolean> = [];

  if (search) {
    values.push(`%${search.trim()}%`);
    filters.push(
      `(name ILIKE $${values.length} OR origin ILIKE $${values.length} OR destination ILIKE $${values.length})`
    );
  }

  if (is_active !== undefined) {
    values.push(is_active === 'true');
    filters.push(`is_active = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM routes ${whereClause}`,
    values
  );

  values.push(limit);
  const limitIndex  = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT
      id,
      name,
      origin,
      destination,
      distance_km,
      estimated_duration_min,
      is_active,
      created_at,
      updated_at
     FROM routes
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return {
    rows:  result.rows,
    total: countResult.rows[0].total,
  };
};

// ============================================================
// GET BY ID
// ============================================================
export const getRouteByIdService = async (routeId: string) => {
  const result = await pool.query(
    `SELECT
      id, name, origin, destination,
      distance_km, estimated_duration_min,
      is_active, created_at, updated_at
     FROM routes WHERE id = $1`,
    [routeId]
  );

  if (!result.rows[0]) return { code: 'NOT_FOUND' as const };
  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

// ============================================================
// CREATE
// ============================================================
export const createRouteService = async (payload: RoutePayload) => {
  const name        = payload.name!.trim();
  const origin      = payload.origin!.trim();
  const destination = payload.destination!.trim();
  const distanceKm  = payload.distance_km        ?? null;
  const durationMin = payload.estimated_duration_min ?? null;

  // origin và destination không được trùng nhau
  if (origin.toLowerCase() === destination.toLowerCase()) {
    return { code: 'SAME_ORIGIN_DESTINATION' as const };
  }

  // Không cho tạo tuyến trùng (cùng name)
  const duplicate = await pool.query(
    'SELECT id FROM routes WHERE LOWER(name) = LOWER($1)',
    [name]
  );
  if (duplicate.rows[0]) return { code: 'DUPLICATE_NAME' as const };

  const result = await pool.query(
    `INSERT INTO routes (name, origin, destination, distance_km, estimated_duration_min)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, origin, destination, distance_km, estimated_duration_min, is_active, created_at, updated_at`,
    [name, origin, destination, distanceKm, durationMin]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

// ============================================================
// UPDATE
// ============================================================
export const updateRouteService = async (routeId: string, payload: RoutePayload) => {
  const existingResult = await pool.query(
    'SELECT * FROM routes WHERE id = $1',
    [routeId]
  );
  const existing = existingResult.rows[0];
  if (!existing) return { code: 'NOT_FOUND' as const };

  const nextName        = payload.name?.trim()            ?? existing.name;
  const nextOrigin      = payload.origin?.trim()          ?? existing.origin;
  const nextDestination = payload.destination?.trim()     ?? existing.destination;
  const nextDistanceKm  = payload.distance_km             !== undefined ? payload.distance_km  : existing.distance_km;
  const nextDurationMin = payload.estimated_duration_min  !== undefined ? payload.estimated_duration_min : existing.estimated_duration_min;
  const nextIsActive    = payload.is_active               !== undefined ? payload.is_active    : existing.is_active;

  // origin và destination không được trùng nhau
  if (nextOrigin.toLowerCase() === nextDestination.toLowerCase()) {
    return { code: 'SAME_ORIGIN_DESTINATION' as const };
  }

  // Check tên trùng (bỏ qua chính nó)
  if (payload.name) {
    const duplicate = await pool.query(
      'SELECT id FROM routes WHERE LOWER(name) = LOWER($1) AND id <> $2',
      [nextName, routeId]
    );
    if (duplicate.rows[0]) return { code: 'DUPLICATE_NAME' as const };
  }

  // Không cho deactivate tuyến đang có chuyến đi scheduled/active
  if (payload.is_active === false) {
    const activeTrips = await pool.query(
      `SELECT id FROM trips
       WHERE route_id = $1 AND status IN ('scheduled', 'active')
       LIMIT 1`,
      [routeId]
    );
    if (activeTrips.rows[0]) return { code: 'ROUTE_HAS_ACTIVE_TRIPS' as const };
  }

  const result = await pool.query(
    `UPDATE routes SET
      name                   = $1,
      origin                 = $2,
      destination            = $3,
      distance_km            = $4,
      estimated_duration_min = $5,
      is_active              = $6
     WHERE id = $7
     RETURNING id, name, origin, destination, distance_km, estimated_duration_min, is_active, created_at, updated_at`,
    [nextName, nextOrigin, nextDestination, nextDistanceKm, nextDurationMin, nextIsActive, routeId]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

// ============================================================
// DELETE
// ============================================================
export const deleteRouteService = async (routeId: string) => {
  const existingResult = await pool.query(
    'SELECT id, name FROM routes WHERE id = $1',
    [routeId]
  );
  const existing = existingResult.rows[0];
  if (!existing) return { code: 'NOT_FOUND' as const };

  // Không cho xóa nếu còn chuyến đi scheduled hoặc active
  const activeTrips = await pool.query(
    `SELECT id FROM trips
     WHERE route_id = $1 AND status IN ('scheduled', 'active')
     LIMIT 1`,
    [routeId]
  );
  if (activeTrips.rows[0]) return { code: 'ROUTE_HAS_ACTIVE_TRIPS' as const };

  try {
    const result = await pool.query(
      `DELETE FROM routes WHERE id = $1
       RETURNING id, name`,
      [routeId]
    );
    return { code: 'SUCCESS' as const, data: result.rows[0] };
  } catch (error: any) {
    if (error?.code === '23503') {
      return { code: 'ROUTE_HAS_LINKED_DATA' as const };
    }
    throw error;
  }
};