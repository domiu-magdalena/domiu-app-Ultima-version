-- Migration: 2026071002_tenant_order_propagation
-- Purpose: propagate and validate tenant ownership across the order domain.

BEGIN;

ALTER TABLE IF EXISTS public.order_tracking
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.order_tracking tracking
SET tenant_id = orders.tenant_id
FROM public.orders orders
WHERE tracking.order_id = orders.id
  AND tracking.tenant_id IS NULL;

DO $$
BEGIN
  IF to_regclass('public.order_tracking') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'order_tracking_tenant_id_fkey'
         AND conrelid = 'public.order_tracking'::regclass
     ) THEN
    ALTER TABLE public.order_tracking
      ADD CONSTRAINT order_tracking_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_order_tracking_tenant_id
  ON public.order_tracking(tenant_id);

CREATE OR REPLACE FUNCTION public.set_order_tenant_from_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_tenant uuid;
BEGIN
  SELECT tenant_id INTO business_tenant
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF business_tenant IS NULL THEN
    RAISE EXCEPTION 'Business % has no tenant', NEW.business_id;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := business_tenant;
  ELSIF NEW.tenant_id <> business_tenant THEN
    RAISE EXCEPTION 'Order tenant does not match business tenant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_tenant_from_business ON public.orders;
CREATE TRIGGER orders_set_tenant_from_business
BEFORE INSERT OR UPDATE OF business_id, tenant_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_tenant_from_business();

CREATE OR REPLACE FUNCTION public.set_child_tenant_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_tenant uuid;
BEGIN
  SELECT tenant_id INTO order_tenant
  FROM public.orders
  WHERE id = NEW.order_id;

  IF order_tenant IS NULL THEN
    RAISE EXCEPTION 'Order % has no tenant', NEW.order_id;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := order_tenant;
  ELSIF NEW.tenant_id <> order_tenant THEN
    RAISE EXCEPTION 'Child record tenant does not match order tenant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_set_tenant_from_order ON public.order_items;
CREATE TRIGGER order_items_set_tenant_from_order
BEFORE INSERT OR UPDATE OF order_id, tenant_id ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_child_tenant_from_order();

DROP TRIGGER IF EXISTS order_tracking_set_tenant_from_order ON public.order_tracking;
CREATE TRIGGER order_tracking_set_tenant_from_order
BEFORE INSERT OR UPDATE OF order_id, tenant_id ON public.order_tracking
FOR EACH ROW EXECUTE FUNCTION public.set_child_tenant_from_order();

CREATE OR REPLACE FUNCTION public.validate_product_tenant_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_tenant uuid;
  product_business uuid;
  order_business uuid;
BEGIN
  SELECT tenant_id, business_id INTO product_tenant, product_business
  FROM public.products
  WHERE id = NEW.product_id;

  SELECT business_id INTO order_business
  FROM public.orders
  WHERE id = NEW.order_id;

  IF product_tenant IS NULL OR product_business IS NULL THEN
    RAISE EXCEPTION 'Product % is not tenant-ready', NEW.product_id;
  END IF;

  IF NEW.tenant_id <> product_tenant THEN
    RAISE EXCEPTION 'Order item tenant does not match product tenant';
  END IF;

  IF order_business <> product_business THEN
    RAISE EXCEPTION 'All order items must belong to the same business';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_validate_product_tenant ON public.order_items;
CREATE TRIGGER order_items_validate_product_tenant
BEFORE INSERT OR UPDATE OF order_id, product_id, tenant_id ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_product_tenant_for_order_item();

COMMIT;
