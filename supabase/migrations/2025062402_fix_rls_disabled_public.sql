-- ============================================================
-- Migration: 2025062402_fix_rls_disabled_public
-- Description: Enable RLS on all public tables + helper functions
-- ============================================================

-- ============================================================
-- PART 1: Security helper functions (idempotent)
-- ============================================================

-- Helper: return current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: is current user a courier?
CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'courier');
$$;

-- Helper: is current user a customer?
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'customer');
$$;

-- Helper: is current user a merchant (business owner)?
CREATE OR REPLACE FUNCTION public.is_merchant()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'merchant');
$$;

-- ============================================================
-- PART 2: Enable RLS and add policies for notification_templates
-- ============================================================

DO $$
BEGIN
  -- Enable RLS (idempotent)
  ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'notification_templates does not exist, skipping';
END;
$$;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Anyone can read notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;

-- Anyone authenticated can read notification templates (public template data)
CREATE POLICY "Anyone can read notification templates"
  ON public.notification_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage notification templates
CREATE POLICY "Admins can manage notification templates"
  ON public.notification_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- PART 3: Ensure RLS is enabled on ALL public tables
--         (defensive: tables that might have been missed)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tables_to_check TEXT[] := ARRAY[
    'profiles', 'roles', 'businesses', 'business_hours', 'categories',
    'products', 'product_images', 'product_variants',
    'addresses', 'business_addresses',
    'orders', 'order_items', 'order_tracking',
    'drivers', 'driver_locations', 'driver_availability', 'driver_earnings',
    'wallets', 'wallet_transactions', 'wallet_topups',
    'chats', 'messages', 'group_chats', 'group_chat_members', 'group_messages',
    'notifications', 'notification_preferences', 'notification_templates',
    'device_tokens',
    'ratings', 'rating_comments', 'rating_reactions',
    'review_reports',
    'cities', 'zones', 'delivery_rates',
    'commission_config', 'commission_transactions', 'business_payouts',
    'coupons', 'coupon_usage', 'referrals', 'loyalty_points', 'rewards',
    'reward_redemptions',
    'customer_favorites', 'customer_payment_methods',
    'geofence_events', 'coverage_polygons',
    'admin_sessions', 'admin_history', 'audit_log', 'admin_audit_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_check
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXCEPTION
      WHEN undefined_table THEN
        -- Table doesn't exist, skip
        NULL;
    END;
  END LOOP;
END;
$$;

-- ============================================================
-- PART 4: Verify and grant execute on helper functions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_courier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_merchant() TO authenticated;
