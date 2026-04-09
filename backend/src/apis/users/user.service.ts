import bcrypt from 'bcryptjs';
import pool from '../../config/database';

type AuthUser = {
  id: string;
  roles: string[];
  agency_id: string | null;
};

type CreateUserPayload = {
  username: string;
  email: string;
  password: string;
  role: string;
  agency_id?: string;
};

type UpdateUserPayload = {
  username?: string;
  email?: string;
  status?: string;
};

const getUserById = async (userId: string) => {
  const result = await pool.query(
    `SELECT
       u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
       COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1 AND u.is_deleted = FALSE
     GROUP BY u.id`,
    [userId]
  );
  return result.rows[0];
};

export const listUsersService = async (currentUser: AuthUser) => {
  if (currentUser.roles.includes('super_admin')) {
    // 1. Super admin xem tất cả
    const result = await pool.query(
      `SELECT
         u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
         COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.is_deleted = FALSE
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }

  // 2. Agency manager xem users trong agency của mình
  const result = await pool.query(
    `SELECT
       u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
       COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.is_deleted = FALSE
       AND d.agency_id = $1
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
    [currentUser.agency_id]
  );
  return result.rows;
};

export const createUserService = async (payload: CreateUserPayload, currentUser: AuthUser) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();

  // 1. Kiểm tra role hợp lệ
  const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [payload.role]);
  if (!roleResult.rows[0]) return { code: 'INVALID_ROLE' as const };

  // 2. Kiểm tra email trùng
  const duplicateEmail = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = $1 AND is_deleted = FALSE',
    [normalizedEmail]
  );
  if (duplicateEmail.rows[0]) return { code: 'DUPLICATE_EMAIL' as const };

  // 3. Kiểm tra username trùng
  const duplicateUsername = await pool.query(
    'SELECT id FROM users WHERE LOWER(username) = $1 AND is_deleted = FALSE',
    [normalizedUsername]
  );
  if (duplicateUsername.rows[0]) return { code: 'DUPLICATE_USERNAME' as const };

  // 4. Tạo user
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const userResult = await pool.query(
    `INSERT INTO users (username, email, password, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id`,
    [normalizedUsername, normalizedEmail, passwordHash]
  );
  const newUserId = userResult.rows[0].id;

  // 5. Gán role
  await pool.query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
    [newUserId, roleResult.rows[0].id]
  );

  const created = await getUserById(newUserId);
  return { code: 'SUCCESS' as const, data: created };
};

export const updateUserService = async (userId: string, payload: UpdateUserPayload, currentUser: AuthUser) => {
  // 1. Tìm user
  const existing = await getUserById(userId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  // 2. Không cho sửa super_admin nếu không phải super_admin
  if (existing.roles.includes('super_admin') && !currentUser.roles.includes('super_admin')) {
    return { code: 'FORBIDDEN' as const };
  }

  // 3. Kiểm tra email trùng
  if (payload.email) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const duplicateEmail = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2 AND is_deleted = FALSE',
      [normalizedEmail, userId]
    );
    if (duplicateEmail.rows[0]) return { code: 'DUPLICATE_EMAIL' as const };
  }

  // 4. Cập nhật
  await pool.query(
    `UPDATE users SET
       username = COALESCE($1, username),
       email = COALESCE($2, email),
       status = COALESCE($3, status)
     WHERE id = $4`,
    [
      payload.username?.trim().toLowerCase() || null,
      payload.email?.trim().toLowerCase() || null,
      payload.status || null,
      userId,
    ]
  );

  const updated = await getUserById(userId);
  return { code: 'SUCCESS' as const, data: updated };
};

export const deleteUserService = async (userId: string, currentUser: AuthUser) => {
  // 1. Tìm user
  const existing = await getUserById(userId);
  if (!existing) return { code: 'NOT_FOUND' as const };

  // 2. Không cho xóa super_admin
  if (existing.roles.includes('super_admin')) {
    return { code: 'CANNOT_DELETE_SUPER_ADMIN' as const };
  }

  // 3. Không cho xóa chính mình
  if (existing.id === currentUser.id) {
    return { code: 'CANNOT_DELETE_SELF' as const };
  }

  // 4. Không cho xóa khi đang on_trip
  if (existing.status === 'on_trip') {
    return { code: 'USER_ON_TRIP' as const };
    }

  // 5. Soft delete
  await pool.query('UPDATE users SET is_deleted = TRUE WHERE id = $1', [userId]);

  return { code: 'SUCCESS' as const, data: { id: existing.id, email: existing.email } };
};