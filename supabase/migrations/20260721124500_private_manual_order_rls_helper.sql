-- Keep the authorization helper available to RLS without exposing it as a
-- PostgREST RPC in the public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_access_manual_order_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.status::text = 'active'
      AND (
        profile.role::text IN (
          'super_admin',
          'admin_general',
          'admin_operativo',
          'admin_soporte',
          'admin'
        )
        OR EXISTS (
          SELECT 1
          FROM public.businesses AS business
          WHERE business.id = p_business_id
            AND business.owner_id = auth.uid()
            AND business.is_active = true
            AND business.deleted_at IS NULL
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_access_manual_order_business(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_manual_order_business(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS manual_order_drafts_scoped_select ON public.manual_order_drafts;
DROP POLICY IF EXISTS manual_order_drafts_scoped_insert ON public.manual_order_drafts;
DROP POLICY IF EXISTS manual_order_drafts_scoped_update ON public.manual_order_drafts;
DROP POLICY IF EXISTS manual_order_drafts_scoped_delete ON public.manual_order_drafts;

CREATE POLICY manual_order_drafts_scoped_select
  ON public.manual_order_drafts FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    AND private.can_access_manual_order_business(business_id)
  );

CREATE POLICY manual_order_drafts_scoped_insert
  ON public.manual_order_drafts FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND private.can_access_manual_order_business(business_id)
  );

CREATE POLICY manual_order_drafts_scoped_update
  ON public.manual_order_drafts FOR UPDATE TO authenticated
  USING (
    actor_id = auth.uid()
    AND private.can_access_manual_order_business(business_id)
  )
  WITH CHECK (
    actor_id = auth.uid()
    AND private.can_access_manual_order_business(business_id)
  );

CREATE POLICY manual_order_drafts_scoped_delete
  ON public.manual_order_drafts FOR DELETE TO authenticated
  USING (
    actor_id = auth.uid()
    AND private.can_access_manual_order_business(business_id)
  );

DROP FUNCTION IF EXISTS public.can_access_manual_order_business(uuid);
