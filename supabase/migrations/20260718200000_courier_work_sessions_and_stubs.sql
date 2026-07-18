-- Jornadas de repartidores y consolidación diaria para desprendibles.

create or replace function public.open_courier_operation(p_note text default null)
returns public.operation_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.operation_sessions%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'courier' and status = 'active' and deleted_at is null
  ) then
    raise exception 'Solo un repartidor activo puede abrir su jornada';
  end if;

  select * into v_session
  from public.operation_sessions
  where actor_id = auth.uid() and session_type = 'courier' and status = 'open'
  limit 1;
  if found then return v_session; end if;

  insert into public.operation_sessions (
    session_type, actor_id, status, opened_by, opening_note
  ) values ('courier', auth.uid(), 'open', auth.uid(), nullif(trim(p_note), ''))
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function public.close_courier_operation(p_note text default null)
returns public.operation_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.operation_sessions%rowtype;
begin
  if exists (
    select 1 from public.orders
    where courier_id = auth.uid()
      and status in ('assigned','accepted','picked_up','in_transit')
      and deleted_at is null
  ) then
    raise exception 'No puedes cerrar la jornada mientras tengas un domicilio activo';
  end if;

  update public.operation_sessions
  set status = 'closed',
      closed_at = now(),
      online_seconds = greatest(0, extract(epoch from (now() - opened_at))::bigint),
      closed_by = auth.uid(),
      closing_note = nullif(trim(p_note), ''),
      updated_at = now()
  where actor_id = auth.uid() and session_type = 'courier' and status = 'open'
  returning * into v_session;

  if not found then raise exception 'No tienes una jornada abierta'; end if;
  return v_session;
end;
$$;

grant execute on function public.open_courier_operation(text) to authenticated;
grant execute on function public.close_courier_operation(text) to authenticated;

create or replace view public.courier_daily_payment_stub_v
with (security_invoker = true)
as
with order_totals as (
  select
    o.courier_id,
    (o.updated_at at time zone 'America/Bogota')::date as work_date,
    count(*) filter (where o.status = 'delivered')::integer as completed_deliveries,
    coalesce(sum(o.delivery_fee) filter (where o.status = 'delivered'), 0)::bigint as delivery_fees_cop,
    coalesce(sum(o.courier_earnings) filter (where o.status = 'delivered'), 0)::bigint as courier_net_earnings_cop,
    coalesce(sum(o.total_amount) filter (where o.status = 'delivered' and o.payment_holder = 'courier'), 0)::bigint as cash_collected_cop,
    coalesce(sum(o.courier_earnings - case when o.payment_holder = 'courier' then o.total_amount else 0 end) filter (where o.status = 'delivered'), 0)::bigint as period_balance_effect_cop,
    min(o.created_at) as first_order_at,
    max(o.updated_at) as last_order_at
  from public.orders o
  where o.courier_id is not null
  group by o.courier_id, (o.updated_at at time zone 'America/Bogota')::date
), session_totals as (
  select
    s.actor_id as courier_id,
    (s.opened_at at time zone 'America/Bogota')::date as work_date,
    count(*)::integer as shifts_count,
    coalesce(sum(
      case
        when s.status = 'open' then greatest(0, extract(epoch from (now() - s.opened_at))::bigint)
        else s.online_seconds
      end
    ), 0)::bigint as online_seconds,
    min(s.opened_at) as first_online_at,
    max(coalesce(s.closed_at, now())) as last_offline_at
  from public.operation_sessions s
  where s.session_type = 'courier'
  group by s.actor_id, (s.opened_at at time zone 'America/Bogota')::date
), keys as (
  select courier_id, work_date from order_totals
  union
  select courier_id, work_date from session_totals
)
select
  k.courier_id,
  k.work_date,
  coalesce(s.shifts_count, 0) as shifts_count,
  coalesce(s.online_seconds, 0)::bigint as online_seconds,
  coalesce(o.completed_deliveries, 0) as completed_deliveries,
  coalesce(o.delivery_fees_cop, 0)::bigint as delivery_fees_cop,
  coalesce(o.courier_net_earnings_cop, 0)::bigint as courier_net_earnings_cop,
  coalesce(o.cash_collected_cop, 0)::bigint as cash_collected_cop,
  coalesce(o.period_balance_effect_cop, 0)::bigint as period_balance_effect_cop,
  s.first_online_at,
  s.last_offline_at,
  o.first_order_at,
  o.last_order_at
from keys k
left join order_totals o on o.courier_id = k.courier_id and o.work_date = k.work_date
left join session_totals s on s.courier_id = k.courier_id and s.work_date = k.work_date;
