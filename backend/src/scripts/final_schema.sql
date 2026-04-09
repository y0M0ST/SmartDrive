-- ============================================================
-- SMARTDRIVE DATABASE SCHEMA V4
-- ============================================================

-- 1. AGENCIES
CREATE TABLE IF NOT EXISTS agencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  name        VARCHAR(255) NOT NULL UNIQUE,
  address     TEXT,
  phone       VARCHAR(20),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(100) NOT NULL UNIQUE
);

-- 3. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

-- 4. ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 5. USERS
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(100) NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'on_trip', 'banned')),
  is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  password_reset_token    VARCHAR(10),
  password_reset_expires  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. USER_ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Liên kết agencies với users (manager)
ALTER TABLE agencies
  ADD CONSTRAINT fk_agencies_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 7. ROUTES
CREATE TABLE IF NOT EXISTS routes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL UNIQUE,
  start_point         VARCHAR(255) NOT NULL,
  end_point           VARCHAR(255) NOT NULL,
  distance            NUMERIC(10, 2),
  estimated_duration  INTEGER,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  model        VARCHAR(100),
  type         VARCHAR(50),
  capacity     INTEGER,
  status       VARCHAR(20) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'on_trip', 'maintenance', 'retired')),
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  device_code VARCHAR(100) NOT NULL UNIQUE,
  last_online TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) NOT NULL UNIQUE,
  identity_card   VARCHAR(20) NOT NULL UNIQUE,
  license_number  VARCHAR(50) NOT NULL UNIQUE,
  license_type    VARCHAR(10) NOT NULL,
  license_expiry  DATE NOT NULL,
  face_encoding   TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'on_trip', 'inactive', 'on_trip', 'banned')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. DRIVER_VEHICLE_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);

-- 12. TRIPS
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  route_id        UUID NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
  status          VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  scheduled_start TIMESTAMPTZ NOT NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. TRIP_LOGS
CREATE TABLE IF NOT EXISTS trip_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude    NUMERIC(10, 7) NOT NULL,
  longitude   NUMERIC(10, 7) NOT NULL,
  speed       NUMERIC(6, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. VIOLATION_TYPES
CREATE TABLE IF NOT EXISTS violation_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

-- 15. VIOLATION_CONFIGS
CREATE TABLE IF NOT EXISTS violation_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type_id UUID NOT NULL REFERENCES violation_types(id) ON DELETE CASCADE,
  points_to_subtract INTEGER NOT NULL DEFAULT 0,
  penalty_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 16. VIOLATIONS
CREATE TABLE IF NOT EXISTS violations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
  violation_type_id UUID NOT NULL REFERENCES violation_types(id) ON DELETE RESTRICT,
  description       TEXT,
  img_url           TEXT,
  latitude          NUMERIC(10, 7),
  longitude         NUMERIC(10, 7),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. DRIVER_SCORES
CREATE TABLE IF NOT EXISTS driver_scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id  UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 100,
  month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, month, year)
);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  content    TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: chỉ giữ updated_at, bỏ hết trigger nghiệp vụ
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_agency_id ON drivers(agency_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_agency_id ON vehicles(agency_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_violations_trip_id ON violations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_trip_id ON trip_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_scores_driver_id ON driver_scores(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);