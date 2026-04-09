// route.service.ts
import pool from '../../config/database';

type RoutePayload = {
  name?: string;
  start_point?: string;
  end_point?: string;
  distance?: number;
  estimated_duration?: number;
};

const getRouteById = async (routeId: string) => {
  const result = await pool.query(
    `SELECT id, name, start_point, end_point, distance, estimated_duration, is_deleted, created_at, updated_at
     FROM routes WHERE id = $1 AND is_deleted = FALSE`,
    [routeId]
  );
  return result.rows[0] || null;
};

export const listRoutesService = async () => {
  const result = await pool.query(
    `SELECT
       r.id, r.name, r.start_point, r.end_point, r.distance, r.estimated_duration,
       r.created_at, r.updated_at,
       COALESCE((SELECT COUNT(*)::int FROM trips t WHERE t.route_id = r.id), 0) AS trip_count
     FROM routes r
     WHERE r.is_deleted = FALSE
     ORDER BY r.created_at DESC`
  );
  return result.rows;
};

export const getRouteByIdService = async (routeId: string) => {
  const route = await getRouteById(routeId);
  if (!route) return { code: 'NOT_FOUND' as const };
  return { code: 'SUCCESS' as const, data: route };
};

export const createRouteService = async (payload: RoutePayload) => {
  const name = payload.name!.trim();
  const startPoint = payload.start_point!.trim();
  const endPoint = payload.end_point!.trim();

  // 1. Điểm đi và điểm đến không được trùng nhau
  if (startPoint.toLowerCase() === endPoint.toLowerCase()) {
    return { code: 'SAME_START_END_POINT' as const };
  }

  // 2. Kiểm tra tên trùng
  const dupName = await pool.query(
    'SELECT id FROM routes WHERE LOWER(name) = LOWER($1) AND is_deleted = FALSE',
    [name]
  );
  if (dupName.rows[0]) return { code: 'DUPLICATE_NAME' as const };

  // 3. Tạo route
  const result = await pool.query(
    `INSERT INTO routes (name, start_point, end_point, distance, estimated_duration)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, start_point, end_point, distance, estimated_duration, created_at, updated_at`,
    [name, startPoint, endPoint, payload.distance || null, payload.estimated_duration || null]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

export const updateRouteService = async (routeId: string, payload: RoutePayload) => {
  const existing = await getRouteById(routeId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  const nextName = payload.name?.trim() || existing.name;
  const nextStart = payload.start_point?.trim() || existing.start_point;
  const nextEnd = payload.end_point?.trim() || existing.end_point;

  if (nextStart.toLowerCase() === nextEnd.toLowerCase()) {
    return { code: 'SAME_START_END_POINT' as const };
  }

  if (payload.name) {
    const dupName = await pool.query(
      'SELECT id FROM routes WHERE LOWER(name) = LOWER($1) AND id <> $2 AND is_deleted = FALSE',
      [nextName, routeId]
    );
    if (dupName.rows[0]) return { code: 'DUPLICATE_NAME' as const };
  }

  const result = await pool.query(
    `UPDATE routes SET
       name               = $1,
       start_point        = $2,
       end_point          = $3,
       distance           = $4,
       estimated_duration = $5
     WHERE id = $6
     RETURNING id, name, start_point, end_point, distance, estimated_duration, created_at, updated_at`,
    [
      nextName, nextStart, nextEnd,
      payload.distance === undefined ? existing.distance : payload.distance,
      payload.estimated_duration === undefined ? existing.estimated_duration : payload.estimated_duration,
      routeId,
    ]
  );

  return { code: 'SUCCESS' as const, data: result.rows[0] };
};

export const deleteRouteService = async (routeId: string) => {
  const existing = await getRouteById(routeId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  // Kiểm tra chuyến đi đang active
  const activeTrips = await pool.query(
    `SELECT id FROM trips WHERE route_id = $1 AND status IN ('scheduled', 'active') LIMIT 1`,
    [routeId]
  );
  if (activeTrips.rows[0]) return { code: 'ROUTE_HAS_ACTIVE_TRIPS' as const };

  await pool.query('UPDATE routes SET is_deleted = TRUE WHERE id = $1', [routeId]);

  return { code: 'SUCCESS' as const, data: existing };
};