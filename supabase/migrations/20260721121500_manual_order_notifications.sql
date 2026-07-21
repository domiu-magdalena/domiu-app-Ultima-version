-- Emit in-app notifications for confirmed manual orders without making
-- notification delivery part of the order transaction's success criteria.
CREATE OR REPLACE FUNCTION public.notify_manual_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id uuid;
  v_admin record;
BEGIN
  IF NEW.created_manually IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO v_owner_id
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_owner_id IS NOT NULL AND v_owner_id IS DISTINCT FROM NEW.created_by_user_id THEN
    BEGIN
      PERFORM public.create_notification(
        p_recipient_id => v_owner_id,
        p_notification_type => 'new_order',
        p_title => 'Nuevo pedido manual',
        p_message => 'Se creó el pedido #' || NEW.order_number || ' para tu negocio',
        p_order_id => NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'manual_order_business_notification_failed order=% error=%', NEW.id, SQLERRM;
    END;
  END IF;

  IF NEW.courier_id IS NOT NULL THEN
    BEGIN
      PERFORM public.create_notification(
        p_recipient_id => NEW.courier_id,
        p_notification_type => 'order_assigned',
        p_title => 'Pedido asignado',
        p_message => 'Se te asignó el pedido #' || NEW.order_number,
        p_order_id => NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'manual_order_courier_notification_failed order=% error=%', NEW.id, SQLERRM;
    END;
  END IF;

  IF NEW.created_from_panel = 'business' THEN
    FOR v_admin IN
      SELECT id
      FROM public.profiles
      WHERE role::text IN ('super_admin', 'admin_general', 'admin_operativo', 'admin')
        AND status::text = 'active'
        AND id IS DISTINCT FROM NEW.created_by_user_id
    LOOP
      BEGIN
        PERFORM public.create_notification(
          p_recipient_id => v_admin.id,
          p_notification_type => 'manual_order_created',
          p_title => 'Pedido manual registrado',
          p_message => 'El negocio registró el pedido #' || NEW.order_number,
          p_order_id => NEW.id
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'manual_order_admin_notification_failed order=% admin=% error=%', NEW.id, v_admin.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_manual_order_created_trigger ON public.orders;
CREATE TRIGGER notify_manual_order_created_trigger
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.created_manually = true)
EXECUTE FUNCTION public.notify_manual_order_created();

REVOKE ALL ON FUNCTION public.notify_manual_order_created() FROM PUBLIC, anon, authenticated;
