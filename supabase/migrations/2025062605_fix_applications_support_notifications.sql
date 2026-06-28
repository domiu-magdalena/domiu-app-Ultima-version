-- Migration: 2025062605 - Fix applications/support notifications for production
-- Purpose:
-- 1) Ensure notification enum values used by courier workflow exist.
-- 2) Replace broken application notification trigger from 2025062602.
-- 3) Use the real notifications columns: recipient_id, notification_type, title, message.
-- 4) Avoid invalid role enum literals by casting role::text.

alter type notification_type add value if not exists 'order_assigned';
alter type notification_type add value if not exists 'admin_alert';

drop trigger if exists notify_admin_courier_application on public.courier_applications;
drop trigger if exists notify_admin_business_application on public.business_applications;

drop function if exists public.notify_admin_new_application();

create or replace function public.notify_admin_new_application()
returns trigger as $$
declare
  v_title text;
  v_message text;
begin
  v_title := case
    when tg_table_name = 'courier_applications' then 'Nueva solicitud de repartidor'
    else 'Nueva solicitud de negocio'
  end;

  v_message := case
    when tg_table_name = 'courier_applications' then coalesce(new.full_name, 'Un cliente') || ' quiere ser repartidor'
    else coalesce(new.business_name, 'Un negocio') || ' quiere registrarse en DomiU'
  end;

  insert into public.notifications (
    recipient_id,
    notification_type,
    title,
    message,
    reference_id,
    reference_type,
    channels,
    metadata
  )
  select
    p.id,
    'system_alert'::notification_type,
    v_title,
    v_message,
    new.id::text,
    tg_table_name,
    array['in_app']::notification_channel[],
    jsonb_build_object(
      'application_id', new.id,
      'application_type', tg_table_name,
      'user_id', new.user_id,
      'status', new.status
    )
  from public.profiles p
  where p.role::text in ('admin', 'super_admin', 'admin_general', 'admin_operativo', 'admin_soporte')
    and p.status = 'active';

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger notify_admin_courier_application
after insert on public.courier_applications
for each row execute function public.notify_admin_new_application();

create trigger notify_admin_business_application
after insert on public.business_applications
for each row execute function public.notify_admin_new_application();
