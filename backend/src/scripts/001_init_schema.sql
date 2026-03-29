CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  role          VARCHAR(30)   NOT NULL DEFAULT 'dispatcher',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  password_reset_token   VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admins_email UNIQUE (email),
  CONSTRAINT chk_admins_role CHECK (role IN ('super_admin','dispatcher'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_admin_id     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  full_name               VARCHAR(150)  NOT NULL,
  phone                   VARCHAR(20)   NOT NULL,
  license_number          VARCHAR(50)   NOT NULL,
  license_expiry_date     DATE          NOT NULL,
  license_type            VARCHAR(10)   NOT NULL,
  face_image_url          TEXT,
  safety_score            FLOAT         NOT NULL DEFAULT 100.0,
  safety_score_formula    VARCHAR(255),
  safety_score_updated_at TIMESTAMPTZ,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_drivers_phone   UNIQUE (phone),
  CONSTRAINT uq_drivers_license UNIQUE (license_number),
  CONSTRAINT chk_drivers_status CHECK (status IN ('active','on_trip','banned')),
  CONSTRAINT chk_drivers_score  CHECK (safety_score >= 0 AND safety_score <= 100)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate            VARCHAR(20)  NOT NULL,
  brand                    VARCHAR(100) NOT NULL,
  model                    VARCHAR(100) NOT NULL,
  seat_count               INTEGER      NOT NULL,
  vehicle_type             VARCHAR(30)  NOT NULL,
  status                   VARCHAR(20)  NOT NULL DEFAULT 'available',
  registration_expiry_date DATE         NOT NULL,
  insurance_expiry_date    DATE         NOT NULL,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vehicles_plate   UNIQUE (license_plate),
  CONSTRAINT chk_vehicles_status CHECK (status IN ('available','on_trip','maintenance')),
  CONSTRAINT chk_vehicles_seats  CHECK (seat_count > 0)
);

CREATE TABLE IF NOT EXISTS routes (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(200) NOT NULL,
  origin                 VARCHAR(100) NOT NULL,
  destination            VARCHAR(100) NOT NULL,
  distance_km            FLOAT,
  estimated_duration_min INTEGER,
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_devices (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  device_token     VARCHAR(255)  NOT NULL,
  firmware_version VARCHAR(20),
  status           VARCHAR(20)   NOT NULL DEFAULT 'active',
  last_seen_at     TIMESTAMPTZ,
  registered_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_edge_vehicle UNIQUE (vehicle_id),
  CONSTRAINT uq_edge_token   UNIQUE (device_token),
  CONSTRAINT chk_edge_status CHECK (status IN ('active','inactive','lost','decommissioned'))
);

CREATE TABLE IF NOT EXISTS trips (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id           UUID         NOT NULL REFERENCES vehicles(id)      ON DELETE RESTRICT,
  route_id             UUID         NOT NULL REFERENCES routes(id)        ON DELETE RESTRICT,
  started_by_device_id UUID                  REFERENCES edge_devices(id) ON DELETE SET NULL,
  trip_code            VARCHAR(50)  NOT NULL,
  scheduled_departure  TIMESTAMPTZ  NOT NULL,
  scheduled_arrival    TIMESTAMPTZ  NOT NULL,
  actual_departure     TIMESTAMPTZ,
  actual_arrival       TIMESTAMPTZ,
  status               VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  start_lat            FLOAT,
  start_lng            FLOAT,
  end_lat              FLOAT,
  end_lng              FLOAT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_trips_code      UNIQUE (trip_code),
  CONSTRAINT chk_trips_status   CHECK (status IN ('scheduled','active','completed','cancelled')),
  CONSTRAINT chk_trips_schedule CHECK (scheduled_arrival > scheduled_departure)
);

CREATE TABLE IF NOT EXISTS trip_drivers (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                  UUID        NOT NULL REFERENCES trips(id)   ON DELETE CASCADE,
  driver_id                UUID        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  role                     VARCHAR(20) NOT NULL DEFAULT 'primary',
  assigned_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkin_at               TIMESTAMPTZ,
  checkout_at              TIMESTAMPTZ,
  face_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  face_verified_img        TEXT,
  is_current_driver        BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_td_trip_driver UNIQUE (trip_id, driver_id),
  CONSTRAINT chk_td_role       CHECK (role IN ('primary','relief')),
  CONSTRAINT chk_td_fvs        CHECK (face_verification_status IN ('pending','verified','failed'))
);

CREATE TABLE IF NOT EXISTS violation_logs (
  id                 UUID        PRIMARY KEY,
  trip_id            UUID        NOT NULL REFERENCES trips(id)   ON DELETE RESTRICT,
  driver_id          UUID        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  violation_type     VARCHAR(50) NOT NULL,
  gps_lat            FLOAT       NOT NULL,
  gps_lng            FLOAT       NOT NULL,
  speed_kmh          FLOAT       NOT NULL DEFAULT 0.0,
  duration_seconds   INTEGER     NOT NULL DEFAULT 0,
  evidence_image_url TEXT,
  evidence_video_url TEXT,
  severity           VARCHAR(10) NOT NULL DEFAULT 'medium',
  sync_status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  occurred_at        TIMESTAMPTZ NOT NULL,
  synced_at          TIMESTAMPTZ,
  CONSTRAINT chk_vl_type     CHECK (violation_type IN ('drowsiness','distraction','yawning','phone','identity_mismatch')),
  CONSTRAINT chk_vl_severity CHECK (severity IN ('low','medium','high')),
  CONSTRAINT chk_vl_sync     CHECK (sync_status IN ('pending','synced')),
  CONSTRAINT chk_vl_speed    CHECK (speed_kmh >= 0)
);

CREATE TABLE IF NOT EXISTS violation_alert_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_log_id    UUID        NOT NULL REFERENCES violation_logs(id) ON DELETE RESTRICT,
  handled_by_admin_id UUID                 REFERENCES admins(id)         ON DELETE SET NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  note                TEXT,
  handled_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_val_status CHECK (status IN ('pending','acknowledged','resolved'))
);

CREATE TABLE IF NOT EXISTS gps_tracking (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  lat         FLOAT       NOT NULL,
  lng         FLOAT       NOT NULL,
  speed_kmh   FLOAT       NOT NULL DEFAULT 0.0,
  heading     FLOAT,
  recorded_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_gps_lat   CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT chk_gps_lng   CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT chk_gps_speed CHECK (speed_kmh >= 0)
);

CREATE TABLE IF NOT EXISTS salary_config (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key   VARCHAR(100)   NOT NULL,
  config_value DECIMAL(15,2)  NOT NULL,
  description  VARCHAR(255),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_salary_config_key  UNIQUE (config_key),
  CONSTRAINT chk_salary_config_val CHECK (config_value >= 0)
);

CREATE TABLE IF NOT EXISTS salary_records (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id             UUID           NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  month                 INTEGER        NOT NULL,
  year                  INTEGER        NOT NULL,
  total_trips           INTEGER        NOT NULL DEFAULT 0,
  total_violations      INTEGER        NOT NULL DEFAULT 0,
  base_salary           DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  trip_bonus            DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  violation_penalty     DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  final_salary          DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  safety_score_snapshot FLOAT,
  status                VARCHAR(20)    NOT NULL DEFAULT 'draft',
  calculated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  paid_at               TIMESTAMPTZ,
  exported_at           TIMESTAMPTZ,
  exported_by           UUID           REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT uq_sr_driver_month_year UNIQUE (driver_id, month, year),
  CONSTRAINT chk_sr_month  CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT chk_sr_year   CHECK (year >= 2024),
  CONSTRAINT chk_sr_status CHECK (status IN ('draft','confirmed','paid'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        UUID        NOT NULL REFERENCES edge_devices(id)   ON DELETE CASCADE,
  violation_log_id UUID                 REFERENCES violation_logs(id) ON DELETE SET NULL,
  sync_type        VARCHAR(30) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count      INTEGER     NOT NULL DEFAULT 0,
  error_message    TEXT,
  attempted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at     TIMESTAMPTZ,
  CONSTRAINT chk_sl_type   CHECK (sync_type IN ('violation','gps_batch','faceid')),
  CONSTRAINT chk_sl_status CHECK (status IN ('pending','success','failed','retrying')),
  CONSTRAINT chk_sl_retry  CHECK (retry_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_drivers_status      ON drivers (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_status     ON vehicles (status);
CREATE INDEX IF NOT EXISTS idx_trips_status        ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_departure     ON trips (scheduled_departure) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_td_driver           ON trip_drivers (driver_id);
CREATE INDEX IF NOT EXISTS idx_td_trip             ON trip_drivers (trip_id);
CREATE INDEX IF NOT EXISTS idx_td_current          ON trip_drivers (trip_id) WHERE is_current_driver = TRUE;
CREATE INDEX IF NOT EXISTS idx_vl_driver_time      ON violation_logs (driver_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_vl_trip             ON violation_logs (trip_id);
CREATE INDEX IF NOT EXISTS idx_vl_pending          ON violation_logs (trip_id) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_gps_trip_time       ON gps_tracking (trip_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_val_pending         ON violation_alert_logs (created_at DESC) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO salary_config (config_key, config_value, description) VALUES
  ('base_salary',                5000000, 'Luong cung moi thang (VND)'),
  ('bonus_per_trip',             50000,   'Thuong moi ca lai hoan thanh (VND)'),
  ('penalty_per_violation',      100000,  'Phat moi vi pham AI ghi nhan (VND)'),
  ('safety_score_ban_threshold', 60,      'Nguong diem an toan toi thieu')
ON CONFLICT (config_key) DO NOTHING;