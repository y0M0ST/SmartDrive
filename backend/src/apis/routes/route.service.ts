import pool from '../../config/database';

type RoutePayload = {
  name?: string;
  origin?: string;
  destination?: string;
  distance_km?: number;
  estimated_duration_min?: number;
  is_active?: boolean;
};

const getRouteById = async (routeId: string) => {
  const result = await pool.query(
    `SELECT id, name, origin, destination, distance_km, estimated_duration_min, is_active, created_at, updated_at
     FROM routes
     WHERE id = $1 AND deleted_at IS NULL`,
    [routeId]
  );
  return result.rows[0];
};

export const listRoutesService = async () => {
  // 1. Lấy danh sách tuyến đường chưa bị xóa
  const result = await pool.query(
    `SELECT
       r.id,
       r.name,
       r.origin,
       r.destination,
       r.distance_km,
       r.estimated_duration_min,
       r.is_active,
       r.created_at,
       r.updated_at,
       COALESCE((SELECT COUNT(*)::int FROM trips t WHERE t.route_id = r.id), 0) AS trip_count
     FROM routes r
     WHERE r.deleted_at IS NULL
     ORDER BY r.created_at DESC`
  );
  return result.rows;
};

export const getRouteByIdService = async (routeId: string) => {
  // 1. Tìm tuyến đường
  const route = await getRouteById(routeId);
  if (!route) return { code: 'NOT_FOUND' as const };
  return { code: 'SUCCESS' as const, data: route };
};

export const createRouteService = async (payload: RoutePayload) => {
  const name = payload.name!.trim();
  const origin = payload.origin!.trim();
  const destination = payload.destination!.trim();
  const distanceKm = payload.distance_km ?? null;
  const estimatedDurationMin = payload.estimated_duration_min ?? null;

  // 1. Điểm đi và điểm đến không được trùng nhau
  if (origin.toLowerCase() === destination.toLowerCase()) {
    return { code: 'SAME_ORIGIN_DESTINATION' as const };
  }

  // 2. Kiểm tra tên tuyến trùng (chỉ check chưa bị xóa)
  const duplicateName = await pool.query(
    'SELECT id FROM routes WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
    [name]
  );
  if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' as const };

  // 3. Lưu vào DB
  const result = await pool.query(
    `INSERT INTO routes (name, origin, destination, distance_km, estimated_duration_min, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, name, origin, destination, distance_km, estimated_duration_min, is_active, created_at, updated_at`,
    [name, origin, destination, distanceKm, estimatedDurationMin]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

export const updateRouteService = async (routeId: string, payload: RoutePayload) => {
  // 1. Tìm tuyến đường
  const existing = await getRouteById(routeId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  const nextName = payload.name?.trim() || existing.name;
  const nextOrigin = payload.origin?.trim() || existing.origin;
  const nextDestination = payload.destination?.trim() || existing.destination;

  // 2. Điểm đi và điểm đến không được trùng nhau
  if (nextOrigin.toLowerCase() === nextDestination.toLowerCase()) {
    return { code: 'SAME_ORIGIN_DESTINATION' as const };
  }

  // 3. Kiểm tra tên tuyến trùng (bỏ qua chính nó, chỉ check chưa bị xóa)
  if (payload.name) {
    const duplicateName = await pool.query(
      'SELECT id FROM routes WHERE LOWER(name) = LOWER($1) AND id <> $2 AND deleted_at IS NULL',
      [nextName, routeId]
    );
    if (duplicateName.rows[0]) return { code: 'DUPLICATE_NAME' as const };
  }

  // 4. Cập nhật vào DB
  const result = await pool.query(
    `UPDATE routes SET
       name = $1,
       origin = $2,
       destination = $3,
       distance_km = $4,
       estimated_duration_min = $5,
       is_active = $6,
       updated_at = NOW()
     WHERE id = $7
     RETURNING id, name, origin, destination, distance_km, estimated_duration_min, is_active, created_at, updated_at`,
    [
      nextName,
      nextOrigin,
      nextDestination,
      payload.distance_km === undefined ? existing.distance_km : payload.distance_km,
      payload.estimated_duration_min === undefined ? existing.estimated_duration_min : payload.estimated_duration_min,
      payload.is_active === undefined ? existing.is_active : payload.is_active,
      routeId,
    ]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

export const deleteRouteService = async (routeId: string) => {
  // 1. Tìm tuyến đường chưa bị xóa
  const existing = await getRouteById(routeId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  // 2. Không cho soft delete nếu đang có chuyến đi scheduled/active
  const activeTrips = await pool.query(
    `SELECT id FROM trips
     WHERE route_id = $1 AND status IN ('scheduled', 'active')
     LIMIT 1`,
    [routeId]
  );
  if (activeTrips.rows[0]) return { code: 'ROUTE_HAS_ACTIVE_TRIPS' as const };

  // 3. Soft delete — đánh dấu deleted_at thay vì xóa thật
  await pool.query(
    'UPDATE routes SET deleted_at = NOW() WHERE id = $1',
    [routeId]
  );

  return { code: 'SUCCESS' as const, data: existing };
};