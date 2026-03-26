ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS password_reset_token   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;