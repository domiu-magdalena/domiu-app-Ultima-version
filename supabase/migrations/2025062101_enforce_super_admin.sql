-- Migration: 2025062101_enforce_super_admin
-- Description: Super Admin enforcement RLS policies

-- ============================================================
-- FUNCTION: is_super_admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND email = 'domiumagdalena@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Only super admin can promote users to admin role
-- ============================================================
DROP POLICY IF EXISTS "Only super admin can promote to admin" ON profiles;
CREATE POLICY "Only super admin can promote to admin" ON profiles
  FOR UPDATE
  WITH CHECK (
    CASE
      WHEN role = 'admin' THEN is_super_admin()
      ELSE true
    END
  );

-- ============================================================
-- Cannot delete super admin profile
-- ============================================================
DROP POLICY IF EXISTS "Cannot delete super admin" ON profiles;
CREATE POLICY "Cannot delete super admin" ON profiles
  FOR DELETE USING (
    NOT (email = 'domiumagdalena@gmail.com')
  );

-- ============================================================
-- Only super admin can delete other admins
-- ============================================================
DROP POLICY IF EXISTS "Only super admin can delete admins" ON profiles;
CREATE POLICY "Only super admin can delete admins" ON profiles
  FOR DELETE USING (
    CASE
      WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' AND NOT is_super_admin() THEN false
      ELSE true
    END
  );
