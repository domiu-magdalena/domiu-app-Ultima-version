-- Migration: Create admin_audit_log table for client-side audit logging
-- This is the table used by src/services/audit.ts and src/services/admin.ts

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  browser TEXT,
  device TEXT,
  os TEXT,
  location_city TEXT,
  location_country TEXT,
  result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table already existed without them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_audit_log' AND column_name = 'result'
  ) THEN
    ALTER TABLE admin_audit_log ADD COLUMN result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'error'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity_type ON admin_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Create index for result column only if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_audit_log' AND column_name = 'result'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_result ON admin_audit_log(result);
  END IF;
END $$;

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to allow re-runs
DROP POLICY IF EXISTS "Admins can read admin_audit_log" ON admin_audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert admin_audit_log" ON admin_audit_log;

CREATE POLICY "Admins can read admin_audit_log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert admin_audit_log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
