-- Fix application notification triggers that break courier applications.
-- Error fixed: record new has no field business_name

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      tg.tgname AS trigger_name,
      c.relname AS table_name
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname IN ('courier_applications', 'business_applications')
      AND NOT tg.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%business_name%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.notify_application_submitted()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_reference_type TEXT;
  v_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'courier_applications' THEN
    v_name := COALESCE(NEW.full_name, 'Nuevo repartidor');
    v_title := 'Nueva solicitud de repartidor';
    v_message := v_name || ' envio una solicitud para ser repartidor';
    v_reference_type := 'courier_application';

  ELSIF TG_TABLE_NAME = 'business_applications' THEN
    v_name := COALESCE(NEW.business_name, 'Nuevo negocio');
    v_title := 'Nueva solicitud de negocio';
    v_message := v_name || ' envio una solicitud para registrar una tienda';
    v_reference_type := 'business_application';

  ELSE
    RETURN NEW;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id,
      notification_type,
      title,
      message,
      reference_id,
      reference_type,
      metadata
    )
    SELECT
      p.id,
      'new_registration'::notification_type,
      v_title,
      v_message,
      NEW.id::TEXT,
      v_reference_type,
      jsonb_build_object(
        'application_id', NEW.id,
        'application_type', v_reference_type,
        'status', NEW.status
      )
    FROM public.profiles p
    WHERE p.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_courier_application_submitted ON public.courier_applications;
CREATE TRIGGER notify_courier_application_submitted
AFTER INSERT ON public.courier_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_submitted();

DROP TRIGGER IF EXISTS notify_business_application_submitted ON public.business_applications;
CREATE TRIGGER notify_business_application_submitted
AFTER INSERT ON public.business_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_submitted();
