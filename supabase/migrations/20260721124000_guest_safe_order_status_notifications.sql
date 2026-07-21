-- Registered customers keep receiving in-app status notifications. Guest
-- orders have no authenticated recipient, so status changes must not fail or
-- create access by phone number. Business and courier notifications continue.
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_number text := NEW.order_number;
  v_owner_id uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    BEGIN
      CASE NEW.status
        WHEN 'confirmed' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'order_confirmed', 'Pedido Confirmado',
            'Tu pedido #' || v_order_number || ' ha sido confirmado', NEW.id
          );
        WHEN 'preparing' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'order_preparing', 'Preparando tu Pedido',
            'Tu pedido #' || v_order_number || ' está siendo preparado', NEW.id
          );
        WHEN 'ready' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'order_ready', 'Pedido Listo',
            'Tu pedido #' || v_order_number || ' está listo para recoger', NEW.id
          );
        WHEN 'assigned' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'driver_assigned', 'Repartidor Asignado',
            'Se ha asignado un repartidor a tu pedido #' || v_order_number, NEW.id
          );
        WHEN 'in_transit' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'order_in_transit', 'Pedido en Camino',
            'Tu pedido #' || v_order_number || ' está en camino', NEW.id
          );
        WHEN 'delivered' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'order_delivered', 'Pedido Entregado',
            'Tu pedido #' || v_order_number || ' ha sido entregado', NEW.id
          );
        WHEN 'cancelled' THEN
          PERFORM public.create_notification(
            NEW.customer_id, 'order_cancelled', 'Pedido Cancelado',
            'El pedido #' || v_order_number || ' ha sido cancelado', NEW.id
          );
        ELSE
          NULL;
      END CASE;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'customer_order_status_notification_failed order=% customer=% error=%',
        NEW.id, NEW.customer_id, SQLERRM;
    END;
  END IF;

  IF NEW.status = 'assigned' AND NEW.courier_id IS NOT NULL THEN
    BEGIN
      PERFORM public.create_notification(
        NEW.courier_id, 'order_assigned', 'Pedido Asignado',
        'Se te ha asignado el pedido #' || v_order_number, NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'courier_order_status_notification_failed order=% courier=% error=%',
        NEW.id, NEW.courier_id, SQLERRM;
    END;
  END IF;

  IF NEW.status = 'cancelled' THEN
    SELECT owner_id INTO v_owner_id
    FROM public.businesses
    WHERE id = NEW.business_id;

    IF v_owner_id IS NOT NULL THEN
      BEGIN
        PERFORM public.create_notification(
          v_owner_id, 'order_cancelled', 'Pedido Cancelado',
          'El pedido #' || v_order_number || ' ha sido cancelado', NEW.id
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'business_order_status_notification_failed order=% owner=% error=%',
          NEW.id, v_owner_id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
