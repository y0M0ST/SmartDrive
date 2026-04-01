-- Final consolidated SmartDrive schema
--
-- SECTION A. Current operational core (US 5-6)
-- 1. super_admin is the highest account, seeded by the project team, and is not created from UI.
-- 2. agency_manager accounts are created by super_admin and are bound to exactly one agency.
-- 3. agencies can be marked inactive at the data layer; drivers and vehicles still use direct delete and there is no hide/restore flow for them.
--
-- SECTION B. Future account/payroll extension
-- 4. driver accounts are created by agency_manager; there is no public signup flow for drivers.
-- 5. payroll should be based on driver salary contracts plus working/checkin/checkout logs.
-- 6. driver mobile features are tied to driver_accounts, driver_work_logs, trips, and violation data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agencies (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(60)  NOT NULL,
  name          VARCHAR(150) NOT NULL,
  address       VARCHAR(255),
  contact_phone VARCHAR(20),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active','inactive'
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_agencies_code UNIQUE (code),
  CONSTRAINT uq_agencies_name UNIQUE (name),
  CONSTRAINT chk_agencies_status CHECK (status IN ('active','inactive'))
);

CREATE TABLE IF NOT EXISTS admins (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  VARCHAR(255) NOT NULL,
  password_hash          VARCHAR(255) NOT NULL,
  full_name              VARCHAR(150) NOT NULL,
  role                   VARCHAR(30)  NOT NULL,
  agency_id              UUID         REFERENCES agencies(id) ON DELETE RESTRICT,
  created_by_admin_id    UUID         REFERENCES admins(id),
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  password_reset_token   VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admins_email UNIQUE (email),
  CONSTRAINT chk_admins_role CHECK (role IN ('super_admin','agency_manager')),
  CONSTRAINT chk_admins_agency_role CHECK (
    (role = 'super_admin' AND agency_id IS NULL AND created_by_admin_id IS NULL) OR
    (role = 'agency_manager' AND agency_id IS NOT NULL AND created_by_admin_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS drivers (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_admin_id     UUID         REFERENCES admins(id) ON DELETE SET NULL,
  agency_id               UUID         NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  full_name               VARCHAR(150) NOT NULL,
  phone                   VARCHAR(20)  NOT NULL,
  license_number          VARCHAR(50)  NOT NULL,
  license_expiry_date     DATE         NOT NULL,
  license_type            VARCHAR(10)  NOT NULL,
  face_image_url          TEXT,
  safety_score            FLOAT        NOT NULL DEFAULT 100.0,
  safety_score_formula    VARCHAR(255),
  safety_score_updated_at TIMESTAMPTZ,
  status                  VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_drivers_phone UNIQUE (phone),
  CONSTRAINT uq_drivers_license UNIQUE (license_number),
  CONSTRAINT chk_drivers_status CHECK (status IN ('active','on_trip','banned')),
  CONSTRAINT chk_drivers_score CHECK (safety_score >= 0 AND safety_score <= 100)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                UUID         NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
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
  CONSTRAINT uq_vehicles_plate UNIQUE (license_plate),
  CONSTRAINT chk_vehicles_status CHECK (status IN ('available','on_trip','maintenance')),
  CONSTRAINT chk_vehicles_seats CHECK (seat_count > 0)
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
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID         NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  device_token     VARCHAR(255) NOT NULL,
  firmware_version VARCHAR(20),
  status           VARCHAR(20)  NOT NULL DEFAULT 'active',
  last_seen_at     TIMESTAMPTZ,
  registered_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_edge_vehicle UNIQUE (vehicle_id),
  CONSTRAINT uq_edge_token UNIQUE (device_token),
  CONSTRAINT chk_edge_status CHECK (status IN ('active','inactive','lost','decommissioned'))
);

CREATE TABLE IF NOT EXISTS trips (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id           UUID         NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  route_id             UUID         NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
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
  CONSTRAINT uq_trips_code UNIQUE (trip_code),
  CONSTRAINT chk_trips_status CHECK (status IN ('scheduled','active','completed','cancelled')),
  CONSTRAINT chk_trips_schedule CHECK (scheduled_arrival > scheduled_departure)
);

CREATE TABLE IF NOT EXISTS trip_drivers (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                  UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id                UUID        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  role                     VARCHAR(20) NOT NULL DEFAULT 'primary',
  assigned_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkin_at               TIMESTAMPTZ,
  checkout_at              TIMESTAMPTZ,
  face_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  face_verified_img        TEXT,
  is_current_driver        BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_td_trip_driver UNIQUE (trip_id, driver_id),
  CONSTRAINT chk_td_role CHECK (role IN ('primary','relief')),
  CONSTRAINT chk_td_fvs CHECK (face_verification_status IN ('pending','verified','failed'))
);

CREATE TABLE IF NOT EXISTS violation_logs (
  id                 UUID        PRIMARY KEY,
  trip_id            UUID        NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
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
  CONSTRAINT chk_vl_type CHECK (violation_type IN ('drowsiness','distraction','yawning','phone','identity_mismatch')),
  CONSTRAINT chk_vl_severity CHECK (severity IN ('low','medium','high')),
  CONSTRAINT chk_vl_sync CHECK (sync_status IN ('pending','synced')),
  CONSTRAINT chk_vl_speed CHECK (speed_kmh >= 0)
);

CREATE TABLE IF NOT EXISTS violation_alert_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_log_id    UUID        NOT NULL REFERENCES violation_logs(id) ON DELETE RESTRICT,
  handled_by_admin_id UUID                 REFERENCES admins(id) ON DELETE SET NULL,
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
  CONSTRAINT chk_gps_lat CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT chk_gps_lng CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT chk_gps_speed CHECK (speed_kmh >= 0)
);

-- -----------------------------------------------------------------------------
-- Future account/payroll extension
-- These tables are designed for the next phase where agencies create driver
-- login accounts and payroll is calculated from actual working logs.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS driver_accounts (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id              UUID         NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  username               VARCHAR(100) NOT NULL,
  password_hash          VARCHAR(255) NOT NULL,
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  must_change_password   BOOLEAN      NOT NULL DEFAULT TRUE,
  password_reset_token   VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  last_login_at          TIMESTAMPTZ,
  created_by_admin_id    UUID         NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_driver_accounts_driver_id UNIQUE (driver_id),
  CONSTRAINT uq_driver_accounts_username UNIQUE (username),
  CONSTRAINT chk_driver_accounts_username CHECK (char_length(trim(username)) >= 4)
);

CREATE TABLE IF NOT EXISTS driver_salary_contracts (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id              UUID          NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  agency_id              UUID          NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  created_by_admin_id    UUID          REFERENCES admins(id) ON DELETE SET NULL,
  salary_type            VARCHAR(20)   NOT NULL DEFAULT 'hybrid',
  base_salary            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  per_trip_rate          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  per_hour_rate          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  overtime_rate          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  allowance_amount       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  violation_penalty_rate DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  effective_from         DATE          NOT NULL,
  effective_to           DATE,
  is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
  notes                  TEXT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_driver_salary_contracts_driver_from UNIQUE (driver_id, effective_from),
  CONSTRAINT chk_driver_salary_contracts_type CHECK (salary_type IN ('monthly','per_trip','hourly','hybrid')),
  CONSTRAINT chk_driver_salary_contracts_amounts CHECK (
    base_salary >= 0 AND
    per_trip_rate >= 0 AND
    per_hour_rate >= 0 AND
    overtime_rate >= 0 AND
    allowance_amount >= 0 AND
    violation_penalty_rate >= 0
  ),
  CONSTRAINT chk_driver_salary_contracts_period CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS driver_work_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  agency_id        UUID        NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  trip_id          UUID                 REFERENCES trips(id) ON DELETE SET NULL,
  vehicle_id       UUID                 REFERENCES vehicles(id) ON DELETE SET NULL,
  work_date        DATE        NOT NULL,
  checkin_at       TIMESTAMPTZ,
  checkout_at      TIMESTAMPTZ,
  worked_minutes   INTEGER     NOT NULL DEFAULT 0,
  overtime_minutes INTEGER     NOT NULL DEFAULT 0,
  trip_count       INTEGER     NOT NULL DEFAULT 0,
  violation_count  INTEGER     NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'open',
  checkin_source   VARCHAR(20) NOT NULL DEFAULT 'mobile',
  checkout_source  VARCHAR(20),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_driver_work_logs_minutes CHECK (
    worked_minutes >= 0 AND
    overtime_minutes >= 0 AND
    trip_count >= 0 AND
    violation_count >= 0
  ),
  CONSTRAINT chk_driver_work_logs_status CHECK (status IN ('open','completed','approved','rejected')),
  CONSTRAINT chk_driver_work_logs_sources CHECK (
    checkin_source IN ('mobile','device','manual') AND
    (checkout_source IS NULL OR checkout_source IN ('mobile','device','manual'))
  ),
  CONSTRAINT chk_driver_work_logs_time CHECK (
    checkin_at IS NULL OR checkout_at IS NULL OR checkout_at >= checkin_at
  )
);

CREATE TABLE IF NOT EXISTS salary_config (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key   VARCHAR(100)  NOT NULL,
  config_value DECIMAL(15,2) NOT NULL,
  description  VARCHAR(255),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_salary_config_key UNIQUE (config_key),
  CONSTRAINT chk_salary_config_val CHECK (config_value >= 0)
);

CREATE TABLE IF NOT EXISTS salary_records (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id             UUID          NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  agency_id             UUID          NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  contract_id           UUID                   REFERENCES driver_salary_contracts(id) ON DELETE SET NULL,
  month                 INTEGER       NOT NULL,
  year                  INTEGER       NOT NULL,
  total_trips           INTEGER       NOT NULL DEFAULT 0,
  total_violations      INTEGER       NOT NULL DEFAULT 0,
  total_work_minutes    INTEGER       NOT NULL DEFAULT 0,
  total_overtime_minutes INTEGER      NOT NULL DEFAULT 0,
  base_salary           DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  trip_bonus            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  overtime_pay          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  allowance_amount      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  violation_penalty     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  bonus_amount          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gross_salary          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_salary            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  safety_score_snapshot FLOAT,
  status                VARCHAR(20)   NOT NULL DEFAULT 'draft',
  calculated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  paid_at               TIMESTAMPTZ,
  exported_at           TIMESTAMPTZ,
  exported_by           UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sr_driver_month_year UNIQUE (driver_id, month, year),
  CONSTRAINT chk_sr_month CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT chk_sr_year CHECK (year >= 2024),
  CONSTRAINT chk_sr_status CHECK (status IN ('draft','confirmed','paid')),
  CONSTRAINT chk_sr_totals CHECK (
    total_trips >= 0 AND
    total_violations >= 0 AND
    total_work_minutes >= 0 AND
    total_overtime_minutes >= 0
  ),
  CONSTRAINT chk_sr_amounts CHECK (
    base_salary >= 0 AND
    trip_bonus >= 0 AND
    overtime_pay >= 0 AND
    allowance_amount >= 0 AND
    violation_penalty >= 0 AND
    bonus_amount >= 0 AND
    gross_salary >= 0 AND
    net_salary >= 0
  )
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        UUID        NOT NULL REFERENCES edge_devices(id) ON DELETE CASCADE,
  violation_log_id UUID                 REFERENCES violation_logs(id) ON DELETE SET NULL,
  sync_type        VARCHAR(30) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count      INTEGER     NOT NULL DEFAULT 0,
  error_message    TEXT,
  attempted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at     TIMESTAMPTZ,
  CONSTRAINT chk_sl_type CHECK (sync_type IN ('violation','gps_batch','faceid')),
  CONSTRAINT chk_sl_status CHECK (status IN ('pending','success','failed','retrying')),
  CONSTRAINT chk_sl_retry CHECK (retry_count >= 0)
);

ALTER TABLE agencies DROP CONSTRAINT IF EXISTS chk_agencies_status;
ALTER TABLE agencies
  ADD CONSTRAINT chk_agencies_status CHECK (status IN ('active','inactive'));

ALTER TABLE violation_logs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_admins_agency_id ON admins (agency_id);
CREATE INDEX IF NOT EXISTS idx_drivers_agency_id ON drivers (agency_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers (status);
CREATE INDEX IF NOT EXISTS idx_driver_accounts_created_by_admin_id ON driver_accounts (created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_driver_work_logs_driver_date ON driver_work_logs (driver_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_work_logs_trip_id ON driver_work_logs (trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_work_logs_agency_date ON driver_work_logs (agency_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_salary_contracts_driver_id ON driver_salary_contracts (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_salary_contracts_agency_id ON driver_salary_contracts (agency_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_agency_id ON vehicles (agency_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips (scheduled_departure) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_td_driver ON trip_drivers (driver_id);
CREATE INDEX IF NOT EXISTS idx_td_trip ON trip_drivers (trip_id);
CREATE INDEX IF NOT EXISTS idx_td_current ON trip_drivers (trip_id) WHERE is_current_driver = TRUE;
CREATE INDEX IF NOT EXISTS idx_vl_driver_time ON violation_logs (driver_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_vl_trip ON violation_logs (trip_id);
CREATE INDEX IF NOT EXISTS idx_vl_pending ON violation_logs (trip_id) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_gps_trip_time ON gps_tracking (trip_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_val_pending ON violation_alert_logs (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_salary_records_agency_period ON salary_records (agency_id, year, month);
CREATE INDEX IF NOT EXISTS idx_salary_records_status ON salary_records (status);
CREATE INDEX IF NOT EXISTS idx_admins_created_by_admin_id ON admins (created_by_admin_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_driver_salary_contracts_one_active
  ON driver_salary_contracts (driver_id)
  WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validate_admin_creator()
RETURNS TRIGGER AS $$
DECLARE
  creator_role VARCHAR(30);
BEGIN
  IF NEW.role = 'super_admin' THEN
    IF NEW.created_by_admin_id IS NOT NULL THEN
      RAISE EXCEPTION 'super_admin accounts must be bootstrapped and cannot have a creator';
    END IF;

    RETURN NEW;
  END IF;

  SELECT role INTO creator_role
  FROM admins
  WHERE id = NEW.created_by_admin_id;

  IF creator_role IS NULL THEN
    RAISE EXCEPTION 'agency_manager must be created by an existing super_admin account';
  END IF;

  IF creator_role <> 'super_admin' THEN
    RAISE EXCEPTION 'agency_manager must be created by a super_admin account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validate_driver_account_creator()
RETURNS TRIGGER AS $$
DECLARE
  creator_role VARCHAR(30);
  creator_agency_id UUID;
  driver_agency_id UUID;
BEGIN
  SELECT role, agency_id INTO creator_role, creator_agency_id
  FROM admins
  WHERE id = NEW.created_by_admin_id;

  IF creator_role IS NULL THEN
    RAISE EXCEPTION 'driver account creator must be an existing admin account';
  END IF;

  SELECT agency_id INTO driver_agency_id
  FROM drivers
  WHERE id = NEW.driver_id;

  IF driver_agency_id IS NULL THEN
    RAISE EXCEPTION 'driver account must reference an existing driver';
  END IF;

  IF creator_role <> 'agency_manager' THEN
    RAISE EXCEPTION 'driver accounts must be created by an agency_manager account';
  END IF;

  IF creator_agency_id IS DISTINCT FROM driver_agency_id THEN
    RAISE EXCEPTION 'agency_manager can only create driver accounts inside the same agency';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validate_driver_salary_contract()
RETURNS TRIGGER AS $$
DECLARE
  driver_agency_id UUID;
  creator_role VARCHAR(30);
  creator_agency_id UUID;
BEGIN
  SELECT agency_id INTO driver_agency_id
  FROM drivers
  WHERE id = NEW.driver_id;

  IF driver_agency_id IS NULL THEN
    RAISE EXCEPTION 'salary contract must reference an existing driver';
  END IF;

  IF NEW.agency_id IS DISTINCT FROM driver_agency_id THEN
    RAISE EXCEPTION 'salary contract agency must match driver agency';
  END IF;

  IF NEW.created_by_admin_id IS NOT NULL THEN
    SELECT role, agency_id INTO creator_role, creator_agency_id
    FROM admins
    WHERE id = NEW.created_by_admin_id;

    IF creator_role IS NULL THEN
      RAISE EXCEPTION 'salary contract creator must be an existing admin account';
    END IF;

    IF creator_role <> 'super_admin' AND creator_agency_id IS DISTINCT FROM NEW.agency_id THEN
      RAISE EXCEPTION 'only super_admin or same-agency manager can create salary contracts';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validate_driver_work_log()
RETURNS TRIGGER AS $$
DECLARE
  driver_agency_id UUID;
  vehicle_agency_id UUID;
BEGIN
  SELECT agency_id INTO driver_agency_id
  FROM drivers
  WHERE id = NEW.driver_id;

  IF driver_agency_id IS NULL THEN
    RAISE EXCEPTION 'work log must reference an existing driver';
  END IF;

  IF NEW.agency_id IS DISTINCT FROM driver_agency_id THEN
    RAISE EXCEPTION 'work log agency must match driver agency';
  END IF;

  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT agency_id INTO vehicle_agency_id
    FROM vehicles
    WHERE id = NEW.vehicle_id;

    IF vehicle_agency_id IS NULL THEN
      RAISE EXCEPTION 'work log vehicle must reference an existing vehicle';
    END IF;

    IF vehicle_agency_id IS DISTINCT FROM NEW.agency_id THEN
      RAISE EXCEPTION 'work log vehicle must belong to the same agency';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validate_salary_record()
RETURNS TRIGGER AS $$
DECLARE
  contract_driver_id UUID;
  contract_agency_id UUID;
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    SELECT driver_id, agency_id INTO contract_driver_id, contract_agency_id
    FROM driver_salary_contracts
    WHERE id = NEW.contract_id;

    IF contract_driver_id IS NULL THEN
      RAISE EXCEPTION 'salary record contract must reference an existing salary contract';
    END IF;

    IF contract_driver_id IS DISTINCT FROM NEW.driver_id OR contract_agency_id IS DISTINCT FROM NEW.agency_id THEN
      RAISE EXCEPTION 'salary record must match contract driver and agency';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_agencies_updated_at
    BEFORE UPDATE ON agencies
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_validate_admin_creator
    BEFORE INSERT OR UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION fn_validate_admin_creator();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_driver_accounts_updated_at
    BEFORE UPDATE ON driver_accounts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_validate_driver_account_creator
    BEFORE INSERT OR UPDATE ON driver_accounts
    FOR EACH ROW EXECUTE FUNCTION fn_validate_driver_account_creator();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_driver_salary_contracts_updated_at
    BEFORE UPDATE ON driver_salary_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_validate_driver_salary_contract
    BEFORE INSERT OR UPDATE ON driver_salary_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_validate_driver_salary_contract();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_driver_work_logs_updated_at
    BEFORE UPDATE ON driver_work_logs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_validate_driver_work_log
    BEFORE INSERT OR UPDATE ON driver_work_logs
    FOR EACH ROW EXECUTE FUNCTION fn_validate_driver_work_log();
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

DO $$ BEGIN
  CREATE TRIGGER trg_salary_records_updated_at
    BEFORE UPDATE ON salary_records
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_validate_salary_record
    BEFORE INSERT OR UPDATE ON salary_records
    FOR EACH ROW EXECUTE FUNCTION fn_validate_salary_record();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO salary_config (config_key, config_value, description) VALUES
  ('base_salary',                5000000, 'Luong cung moi thang (VND)'),
  ('bonus_per_trip',             50000,   'Thuong moi ca lai hoan thanh (VND)'),
  ('penalty_per_violation',      100000,  'Phat moi vi pham AI ghi nhan (VND)'),
  ('safety_score_ban_threshold', 60,      'Nguong diem an toan toi thieu')
ON CONFLICT (config_key) DO NOTHING;