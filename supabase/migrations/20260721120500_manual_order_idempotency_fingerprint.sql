-- Serialize requests sharing an idempotency key and reject payload conflicts.
ALTER FUNCTION public.create_manual_order_atomic(jsonb, jsonb)
  RENAME TO create_manual_order_atomic_unlocked;

CREATE OR REPLACE FUNCTION public.create_manual_order_atomic(
  p_order jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_idempotency uuid := (p_order->>'idempotency_key')::uuid;
  v_fingerprint text := p_order->'metadata'->>'request_fingerprint';
  v_existing record;
BEGIN
  IF v_idempotency IS NULL OR nullif(v_fingerprint, '') IS NULL THEN
    RAISE EXCEPTION 'manual_order_idempotency_required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_idempotency::text, 0));

  SELECT id, order_number, metadata
  INTO v_existing
  FROM public.orders
  WHERE idempotency_key = v_idempotency
  LIMIT 1;

  IF FOUND THEN
    IF coalesce(v_existing.metadata->>'request_fingerprint', '') <> v_fingerprint THEN
      RAISE EXCEPTION 'manual_order_idempotency_conflict' USING ERRCODE = '22023';
    END IF;

    RETURN jsonb_build_object(
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'idempotent_replay', true
    );
  END IF;

  RETURN public.create_manual_order_atomic_unlocked(p_order, p_items);
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_order_atomic_unlocked(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_manual_order_atomic(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_order_atomic(jsonb, jsonb) TO service_role;
