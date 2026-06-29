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
    WHERE n.nspname = 'public'
      AND c.relname IN ('courier_applications', 'business_applications')
      AND NOT tg.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS update_courier_applications_updated_at ON public.courier_applications;
CREATE TRIGGER update_courier_applications_updated_at
BEFORE UPDATE ON public.courier_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_applications_updated_at ON public.business_applications;
CREATE TRIGGER update_business_applications_updated_at
BEFORE UPDATE ON public.business_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
