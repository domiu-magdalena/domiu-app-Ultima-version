-- Run after manual delivery pricing so payment consistency and earnings use
-- the final database-calculated delivery fee and order total.
CREATE OR REPLACE FUNCTION public.finalize_manual_order_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_paid numeric := coalesce(NEW.paid_amount, 0);
  v_courier_earnings numeric;
BEGIN
  IF NEW.created_manually IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  IF v_paid < 0 OR v_paid > NEW.total_amount THEN
    RAISE EXCEPTION 'manual_order_invalid_paid_amount' USING ERRCODE = '22023';
  END IF;

  IF NEW.payment_status = 'completed'::public.payment_status
     AND v_paid <> NEW.total_amount THEN
    RAISE EXCEPTION 'manual_order_completed_payment_must_match_total' USING ERRCODE = '22023';
  END IF;

  v_courier_earnings := CASE
    WHEN NEW.delivery_type = 'pickup' THEN 0
    ELSE round(coalesce(NEW.delivery_fee, 0) * 0.80)
  END;

  NEW.courier_earnings := v_courier_earnings;
  NEW.platform_earnings := greatest(0, coalesce(NEW.delivery_fee, 0) - v_courier_earnings);
  NEW.outstanding_amount := greatest(0, NEW.total_amount - v_paid);
  NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
    'business_amount', greatest(0, NEW.total_amount - coalesce(NEW.delivery_fee, 0)),
    'partial_payment', v_paid > 0 AND v_paid < NEW.total_amount,
    'amounts_finalized_at', now(),
    'amounts_source', 'database'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_finalize_manual_order_amounts_trigger ON public.orders;
CREATE TRIGGER zz_finalize_manual_order_amounts_trigger
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.created_manually = true)
EXECUTE FUNCTION public.finalize_manual_order_amounts();

REVOKE ALL ON FUNCTION public.finalize_manual_order_amounts() FROM PUBLIC, anon, authenticated;
