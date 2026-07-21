-- Restore catalog inventory exactly once when a manual order is cancelled.
CREATE OR REPLACE FUNCTION public.restore_manual_order_inventory_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_manually = true
     AND NEW.status::text = 'cancelled'
     AND OLD.status::text <> 'cancelled'
     AND coalesce(NEW.metadata->>'manual_inventory_restored_at', '') = '' THEN

    UPDATE public.products AS product
    SET quantity_available = product.quantity_available + restored.quantity,
        total_sales = greatest(0, coalesce(product.total_sales, 0) - restored.quantity),
        updated_at = now()
    FROM (
      SELECT item.product_id, sum(item.quantity)::integer AS quantity
      FROM public.order_items AS item
      WHERE item.order_id = NEW.id
        AND item.product_id IS NOT NULL
        AND item.is_custom_item = false
      GROUP BY item.product_id
    ) AS restored
    WHERE product.id = restored.product_id;

    UPDATE public.orders
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'manual_inventory_restored_at', now(),
      'manual_inventory_restored_from_status', OLD.status::text
    )
    WHERE id = NEW.id
      AND coalesce(metadata->>'manual_inventory_restored_at', '') = '';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restore_manual_order_inventory_trigger ON public.orders;
CREATE TRIGGER restore_manual_order_inventory_trigger
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_manual_order_inventory_on_cancel();

REVOKE ALL ON FUNCTION public.restore_manual_order_inventory_on_cancel() FROM PUBLIC, anon, authenticated;
