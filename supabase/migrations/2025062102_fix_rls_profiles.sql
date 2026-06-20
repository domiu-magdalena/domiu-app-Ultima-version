-- Migration: 2025062102_fix_rls_profiles
-- Description: Re-enable RLS on profiles and fix policies for all tables

-- ============================================================
-- 1. Re-enable RLS on profiles (disabled by 2025061412)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Drop any remaining recursive policies on profiles
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Only super admin can promote to admin" ON profiles;
DROP POLICY IF EXISTS "Cannot delete super admin" ON profiles;
DROP POLICY IF EXISTS "Only super admin can delete admins" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ============================================================
-- 3. Recreate all profiles policies with SECURITY DEFINER
-- ============================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can read other profiles (public info)
CREATE POLICY "Users can read other profiles"
  ON profiles FOR SELECT
  USING (deleted_at IS NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert own profile (registration)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can do anything (uses SECURITY DEFINER to avoid recursion)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (public.is_admin());

-- Super admin policy: only super admin can promote to admin role
CREATE POLICY "Only super admin can promote to admin"
  ON profiles FOR UPDATE
  WITH CHECK (
    CASE
      WHEN role = 'admin' THEN is_super_admin()
      ELSE true
    END
  );

-- ============================================================
-- 4. Fix orders policies — add admin bypass via is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
CREATE POLICY "Admins can read all orders"
  ON orders FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 5. Fix driver_locations policies — add admin bypass
-- ============================================================
DROP POLICY IF EXISTS "Admins can read driver locations" ON driver_locations;
CREATE POLICY "Admins can read driver locations"
  ON driver_locations FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 6. Add policies for tables missing them (deny-all -> proper access)
-- ============================================================

-- ROLES: anyone can read, only admins can modify
DROP POLICY IF EXISTS "Anyone can read roles" ON roles;
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT
  USING (true);

-- BUSINESS HOURS: owners can manage
DROP POLICY IF EXISTS "Owners can manage business hours" ON business_hours;
CREATE POLICY "Anyone can read business hours"
  ON business_hours FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage business hours"
  ON business_hours FOR INSERT
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can update business hours"
  ON business_hours FOR UPDATE
  USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ORDER ITEMS: participants can read
DROP POLICY IF EXISTS "Order participants can read items" ON order_items;
CREATE POLICY "Order participants can read items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR courier_id = auth.uid()
         OR business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  );

-- ORDER TRACKING: participants can read
DROP POLICY IF EXISTS "Order participants can read tracking" ON order_tracking;
CREATE POLICY "Order participants can read tracking"
  ON order_tracking FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR courier_id = auth.uid()
         OR business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  );

-- PRODUCT IMAGES: anyone read, owners manage
DROP POLICY IF EXISTS "Anyone can read product images" ON product_images;
CREATE POLICY "Anyone can read product images"
  ON product_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners can manage product images" ON product_images;
CREATE POLICY "Owners can manage product images"
  ON product_images FOR INSERT
  WITH CHECK (
    product_id IN (SELECT id FROM products WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  );

-- NOTIFICATION PREFERENCES: users manage own
DROP POLICY IF EXISTS "Users can read own notification preferences" ON notification_preferences;
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- DEVICE TOKENS: users manage own
DROP POLICY IF EXISTS "Users can manage own device tokens" ON device_tokens;
CREATE POLICY "Users can read own device tokens"
  ON device_tokens FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own device tokens" ON device_tokens;
CREATE POLICY "Users can insert own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own device tokens" ON device_tokens;
CREATE POLICY "Users can delete own device tokens"
  ON device_tokens FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 7. WALLETS: admins can read all wallets
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all wallets" ON wallets;
CREATE POLICY "Admins can read all wallets"
  ON wallets FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 8. Ensure is_admin() and is_super_admin() functions have SET search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND email = 'domiumagdalena@gmail.com'
  );
END;
$$;
