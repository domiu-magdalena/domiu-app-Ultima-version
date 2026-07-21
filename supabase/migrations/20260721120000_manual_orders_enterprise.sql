-- Manual orders enterprise foundation
-- Supports guest customers without creating auth users, immutable snapshots,
-- idempotency, drafts, custom items and atomic inventory updates.

ALTER TABLE public.orders
  ALTER COLUMN customer_id DROP NOT NULL,
  ALTER COLUMN delivery_address_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS creation_source text NOT NULL DEFAULT 'customer_app',
  ADD COLUMN IF NOT EXISTS created_manually boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_role text,
  ADD COLUMN IF NOT EXISTS created_from_panel text,
  ADD COLUMN IF NOT EXISTS sales_channel text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS sales_channel_detail text,
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS delivery_fee_source text NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS delivery_fee_overridden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_fee_override_reason text,
  ADD COLUMN IF NOT EXISTS guest_customer_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS delivery_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS business_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS courier_notes text,
  ADD COLUMN IF NOT EXISTS admin_reason text,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_amount numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.order_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_custom_item boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_name_snapshot text,
  ADD COLUMN IF NOT EXISTS product_sku_snapshot text,
  ADD COLUMN IF NOT EXISTS variant_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS modifiers_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_manual_idempotency
  ON public.orders(idempotency_key)
  WHERE created_manually = true AND idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_manual_business_created
  ON public.orders(business_id, created_at DESC)
  WHERE created_manually = true;
CREATE INDEX IF NOT EXISTS idx_orders_manual_creator
  ON public.orders(created_by_user_id, created_at DESC)
  WHERE created_manually = true;
CREATE INDEX IF NOT EXISTS idx_orders_sales_channel
  ON public.orders(sales_channel, created_at DESC)
  WHERE created_manually = true;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_creation_source_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_creation_source_check
  CHECK (creation_source IN ('customer_app', 'admin_manual', 'business_manual', 'domi_assisted', 'system'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_created_from_panel_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_created_from_panel_check
  CHECK (created_from_panel IS NULL OR created_from_panel IN ('admin', 'business', 'customer', 'system'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_sales_channel_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_sales_channel_check
  CHECK (sales_channel IN ('app', 'whatsapp', 'phone', 'in_person', 'instagram', 'facebook', 'direct_message', 'other'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_type_check
  CHECK (delivery_type IN ('delivery', 'pickup'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_fee_source_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_fee_source_check
  CHECK (delivery_fee_source IN ('automatic', 'manual', 'not_applicable'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_manual_channel_detail_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_manual_channel_detail_check
  CHECK (sales_channel <> 'other' OR nullif(btrim(sales_channel_detail), '') IS NOT NULL);
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_manual_guest_snapshot_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_manual_guest_snapshot_check
  CHECK (customer_id IS NOT NULL OR created_manually = false OR guest_customer_snapshot IS NOT NULL);
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_manual_delivery_snapshot_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_manual_delivery_snapshot_check
  CHECK (delivery_type = 'pickup' OR created_manually = false OR delivery_snapshot IS NOT NULL);
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_manual_fee_override_reason_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_manual_fee_override_reason_check
  CHECK (delivery_fee_overridden = false OR nullif(btrim(delivery_fee_override_reason), '') IS NOT NULL);
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_manual_amounts_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_manual_amounts_check
  CHECK (
    subtotal >= 0 AND delivery_fee >= 0 AND discount_amount >= 0 AND tax_amount >= 0
    AND total_amount >= 0 AND paid_amount >= 0 AND outstanding_amount >= 0
  );
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pickup_fee_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_pickup_fee_check
  CHECK (delivery_type <> 'pickup' OR delivery_fee = 0);

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_manual_product_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_manual_product_check
  CHECK (
    (is_custom_item = false AND product_id IS NOT NULL)
    OR
    (is_custom_item = true AND product_id IS NULL AND nullif(btrim(product_name_snapshot), '') IS NOT NULL)
  );
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_positive_values_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_positive_values_check
  CHECK (quantity > 0 AND unit_price >= 0 AND item_total >= 0);

CREATE TABLE IF NOT EXISTS public.manual_order_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  panel text NOT NULL CHECK (panel IN ('admin', 'business')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, business_id, panel)
);

CREATE INDEX IF NOT EXISTS idx_manual_order_drafts_expiry
  ON public.manual_order_drafts(expires_at);

ALTER TABLE public.manual_order_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.manual_order_drafts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manual_order_drafts TO authenticated;

DROP POLICY IF EXISTS manual_order_drafts_owner_select ON public.manual_order_drafts;
CREATE POLICY manual_order_drafts_owner_select
  ON public.manual_order_drafts FOR SELECT TO authenticated
  USING (actor_id = auth.uid());
DROP POLICY IF EXISTS manual_order_drafts_owner_insert ON public.manual_order_drafts;
CREATE POLICY manual_order_drafts_owner_insert
  ON public.manual_order_drafts FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
DROP POLICY IF EXISTS manual_order_drafts_owner_update ON public.manual_order_drafts;
CREATE POLICY manual_order_drafts_owner_update
  ON public.manual_order_drafts FOR UPDATE TO authenticated
  USING (actor_id = auth.uid()) WITH CHECK (actor_id = auth.uid());
DROP POLICY IF EXISTS manual_order_drafts_owner_delete ON public.manual_order_drafts;
CREATE POLICY manual_order_drafts_owner_delete
  ON public.manual_order_drafts FOR DELETE TO authenticated
  USING (actor_id = auth.uid());

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
  v_existing public.orders%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2) := round(coalesce((p_order->>'delivery_fee')::numeric, 0));
  v_discount numeric(12,2) := round(coalesce((p_order->>'discount_amount')::numeric, 0));
  v_tax numeric(12,2) := round(coalesce((p_order->>'tax_amount')::numeric, 0));
  v_tip numeric(12,2) := round(coalesce((p_order->>'tip_amount')::numeric, 0));
  v_surcharge numeric(12,2) := round(coalesce((p_order->>'surcharge_amount')::numeric, 0));
  v_total numeric(12,2);
  v_paid numeric(12,2) := round(coalesce((p_order->>'paid_amount')::numeric, 0));
  v_order_number text;
  v_idempotency uuid := (p_order->>'idempotency_key')::uuid;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'manual_order_items_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.orders
  WHERE idempotency_key = v_idempotency
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'idempotent_replay', true
    );
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'manual_order_invalid_quantity' USING ERRCODE = '22023';
    END IF;

    IF coalesce((v_item->>'is_custom_item')::boolean, false) THEN
      v_unit_price := round((v_item->>'unit_price')::numeric);
      IF v_unit_price < 0 OR nullif(btrim(v_item->>'name'), '') IS NULL THEN
        RAISE EXCEPTION 'manual_order_invalid_custom_item' USING ERRCODE = '22023';
      END IF;
    ELSE
      SELECT * INTO v_product
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid
        AND deleted_at IS NULL
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'manual_order_product_not_found' USING ERRCODE = 'P0001';
      END IF;
      IF v_product.business_id <> (p_order->>'business_id')::uuid THEN
        RAISE EXCEPTION 'manual_order_cross_business_product' USING ERRCODE = '42501';
      END IF;
      IF v_product.status::text <> 'available' THEN
        RAISE EXCEPTION 'manual_order_product_unavailable' USING ERRCODE = 'P0001';
      END IF;
      IF v_product.quantity_available < v_quantity THEN
        RAISE EXCEPTION 'manual_order_insufficient_stock' USING ERRCODE = 'P0001';
      END IF;

      v_unit_price := round(coalesce(v_product.discount_price, v_product.price));
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  v_total := greatest(0, v_subtotal - v_discount + v_tax + v_delivery_fee + v_tip + v_surcharge);
  IF v_paid < 0 OR v_paid > v_total THEN
    RAISE EXCEPTION 'manual_order_invalid_paid_amount' USING ERRCODE = '22023';
  END IF;

  v_order_number := public.generate_order_number();

  INSERT INTO public.orders (
    order_number,
    order_code,
    order_type,
    customer_id,
    business_id,
    branch_id,
    courier_id,
    delivery_address_id,
    status,
    payment_status,
    payment_method,
    subtotal,
    delivery_fee,
    discount_amount,
    tax_amount,
    total_amount,
    paid_amount,
    outstanding_amount,
    special_instructions,
    metadata,
    courier_earnings,
    platform_earnings,
    creation_source,
    created_manually,
    created_by_user_id,
    created_by_role,
    created_from_panel,
    sales_channel,
    sales_channel_detail,
    delivery_type,
    delivery_fee_source,
    delivery_fee_overridden,
    delivery_fee_override_reason,
    guest_customer_snapshot,
    delivery_snapshot,
    business_snapshot,
    internal_notes,
    courier_notes,
    admin_reason,
    idempotency_key,
    currency
  ) VALUES (
    v_order_number,
    v_order_number,
    'manual_order',
    nullif(p_order->>'customer_id', '')::uuid,
    (p_order->>'business_id')::uuid,
    nullif(p_order->>'branch_id', '')::uuid,
    nullif(p_order->>'courier_id', '')::uuid,
    null,
    (p_order->>'status')::order_status,
    (p_order->>'payment_status')::payment_status,
    (p_order->>'payment_method')::payment_method,
    v_subtotal,
    v_delivery_fee,
    v_discount,
    v_tax,
    v_total,
    v_paid,
    v_total - v_paid,
    nullif(p_order->>'preparation_notes', ''),
    coalesce(p_order->'metadata', '{}'::jsonb) || jsonb_build_object(
      'tip_amount', v_tip,
      'surcharge_amount', v_surcharge,
      'manual_order_version', 1
    ),
    coalesce((p_order->>'courier_earnings')::numeric, 0),
    coalesce((p_order->>'platform_earnings')::numeric, 0),
    p_order->>'creation_source',
    true,
    (p_order->>'created_by_user_id')::uuid,
    p_order->>'created_by_role',
    p_order->>'created_from_panel',
    p_order->>'sales_channel',
    nullif(p_order->>'sales_channel_detail', ''),
    p_order->>'delivery_type',
    p_order->>'delivery_fee_source',
    coalesce((p_order->>'delivery_fee_overridden')::boolean, false),
    nullif(p_order->>'delivery_fee_override_reason', ''),
    p_order->'guest_customer_snapshot',
    p_order->'delivery_snapshot',
    p_order->'business_snapshot',
    nullif(p_order->>'internal_notes', ''),
    nullif(p_order->>'courier_notes', ''),
    nullif(p_order->>'admin_reason', ''),
    v_idempotency,
    'COP'
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;

    IF coalesce((v_item->>'is_custom_item')::boolean, false) THEN
      v_unit_price := round((v_item->>'unit_price')::numeric);
      INSERT INTO public.order_items (
        order_id, product_id, quantity, unit_price, item_total,
        variant_selections, special_instructions, is_custom_item,
        product_name_snapshot, product_sku_snapshot, variant_snapshot,
        modifiers_snapshot, metadata
      ) VALUES (
        v_order.id, null, v_quantity, v_unit_price, v_unit_price * v_quantity,
        coalesce(v_item->'variant', '{}'::jsonb), nullif(v_item->>'instructions', ''), true,
        v_item->>'name', null, coalesce(v_item->'variant', '{}'::jsonb),
        coalesce(v_item->'modifiers', '[]'::jsonb), coalesce(v_item->'metadata', '{}'::jsonb)
      );
    ELSE
      SELECT * INTO v_product
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid
      FOR UPDATE;

      v_unit_price := round(coalesce(v_product.discount_price, v_product.price));
      UPDATE public.products
      SET quantity_available = quantity_available - v_quantity,
          total_sales = coalesce(total_sales, 0) + v_quantity,
          updated_at = now()
      WHERE id = v_product.id
        AND quantity_available >= v_quantity;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'manual_order_stock_changed' USING ERRCODE = '40001';
      END IF;

      INSERT INTO public.order_items (
        order_id, product_id, quantity, unit_price, item_total,
        variant_selections, special_instructions, is_custom_item,
        product_name_snapshot, product_sku_snapshot, variant_snapshot,
        modifiers_snapshot, metadata
      ) VALUES (
        v_order.id, v_product.id, v_quantity, v_unit_price, v_unit_price * v_quantity,
        coalesce(v_item->'variant', '{}'::jsonb), nullif(v_item->>'instructions', ''), false,
        v_product.name, v_product.sku, coalesce(v_item->'variant', '{}'::jsonb),
        coalesce(v_item->'modifiers', '[]'::jsonb), coalesce(v_item->'metadata', '{}'::jsonb)
      );
    END IF;
  END LOOP;

  INSERT INTO public.order_tracking(order_id, status, notes)
  VALUES (
    v_order.id,
    v_order.status,
    'Pedido manual creado desde panel ' || coalesce(p_order->>'created_from_panel', 'desconocido')
  );

  DELETE FROM public.manual_order_drafts
  WHERE actor_id = (p_order->>'created_by_user_id')::uuid
    AND business_id = (p_order->>'business_id')::uuid
    AND panel = p_order->>'created_from_panel';

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'idempotent_replay', false,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_order_atomic(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_order_atomic(jsonb, jsonb) TO service_role;

COMMENT ON FUNCTION public.create_manual_order_atomic(jsonb, jsonb) IS
  'Creates a manual order transactionally after server-side authorization and pricing validation.';
