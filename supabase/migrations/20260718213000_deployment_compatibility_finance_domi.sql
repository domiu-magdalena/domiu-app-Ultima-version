-- DomiU Magdalena
-- Capa de compatibilidad para desplegar dashboards, reportes, liquidaciones y Domi
-- sobre el núcleo financiero y operativo ya existente en producción.

-- Configuración solicitada: comercio 100 % de sus productos, repartidor 80 %
-- del domicilio, DomiU 20 % del domicilio y tarifa de servicio de 3 %.
update public.platform_financial_settings
set service_fee_rate = 3.000,
    delivery_commission_rate = 20.000,
    version = '2026-07-18-80-20-service-3',
    notes = 'Configuración inicial de pruebas: 80 % repartidor, 20 % DomiU, tarifa de servicio 3 %.',
    updated_at = now()
where is_active = true;

-- Alias de lectura para componentes que utilizan is_open.
alter table public.businesses
  add column if not exists is_open boolean generated always as (is_accepting_orders) stored;

create or replace view public.courier_balance_summary_v
with (security_invoker = true)
as
with shift_totals as (
  select
    courier_id,
    coalesce(sum(net_earnings), 0)::bigint as lifetime_earnings_cop,
    coalesce(sum(cash_collected), 0)::bigint as lifetime_cash_collected_cop,
    max(coalesce(ended_at, started_at)) as last_shift_at
  from public.courier_shifts
  group by courier_id
)
select
  b.participant_id as courier_id,
  b.net_balance::bigint as net_balance_cop,
  b.company_owes_participant::bigint as company_owes_courier_cop,
  b.participant_owes_company::bigint as courier_owes_company_cop,
  coalesce(s.lifetime_earnings_cop, 0)::bigint as lifetime_earnings_cop,
  coalesce(s.lifetime_cash_collected_cop, 0)::bigint as lifetime_cash_collected_cop,
  greatest(b.last_pending_at, s.last_shift_at) as last_movement_at
from public.participant_settlement_balances b
left join shift_totals s on s.courier_id = b.participant_id
where b.participant_type = 'courier'
union all
select
  s.courier_id,
  0::bigint,
  0::bigint,
  0::bigint,
  s.lifetime_earnings_cop,
  s.lifetime_cash_collected_cop,
  s.last_shift_at
from shift_totals s
where not exists (
  select 1
  from public.participant_settlement_balances b
  where b.participant_type = 'courier' and b.participant_id = s.courier_id
);

create or replace view public.courier_daily_payment_stub_v
with (security_invoker = true)
as
select
  cs.courier_id,
  (cs.started_at at time zone 'America/Bogota')::date as work_date,
  count(*)::integer as shifts_count,
  coalesce(sum(
    case
      when cs.status = 'open'
        then greatest(0, extract(epoch from (now() - cs.started_at))::bigint)
      else greatest(0, cs.online_minutes::bigint * 60)
    end
  ), 0)::bigint as online_seconds,
  coalesce(sum(cs.delivered_orders), 0)::integer as completed_deliveries,
  coalesce(sum(cs.gross_delivery_value), 0)::bigint as delivery_fees_cop,
  coalesce(sum(cs.net_earnings), 0)::bigint as courier_net_earnings_cop,
  coalesce(sum(cs.cash_collected), 0)::bigint as cash_collected_cop,
  coalesce(sum(cs.company_owes_courier - cs.courier_owes_company), 0)::bigint as period_balance_effect_cop,
  min(cs.started_at) as first_online_at,
  max(cs.ended_at) as last_offline_at,
  min(o.created_at) filter (where o.status::text = 'delivered') as first_order_at,
  max(coalesce(o.actual_delivery_time, o.updated_at)) filter (where o.status::text = 'delivered') as last_order_at
from public.courier_shifts cs
left join public.orders o
  on o.courier_id = cs.courier_id
 and o.deleted_at is null
 and coalesce(o.actual_delivery_time, o.updated_at) >= cs.started_at
 and coalesce(o.actual_delivery_time, o.updated_at) <= coalesce(cs.ended_at, now())
group by cs.courier_id, (cs.started_at at time zone 'America/Bogota')::date;

create or replace view public.daily_company_operations_v
with (security_invoker = true)
as
with days as (
  select operation_date from public.operations_days
  union
  select distinct (created_at at time zone 'America/Bogota')::date from public.orders
  union
  select distinct (created_at at time zone 'America/Bogota')::date from public.profiles
  union
  select distinct (created_at at time zone 'America/Bogota')::date from public.businesses
)
select
  d.operation_date,
  (select count(*) from public.orders o where (o.created_at at time zone 'America/Bogota')::date = d.operation_date)::integer as orders_created,
  (select count(*) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::integer as orders_delivered,
  (select count(*) from public.orders o where (o.updated_at at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'cancelled')::integer as orders_cancelled,
  (select coalesce(sum(o.subtotal),0) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::bigint as product_sales_cop,
  (select coalesce(sum(o.delivery_fee),0) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::bigint as delivery_fees_cop,
  (select coalesce(sum(o.service_fee),0) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::bigint as service_fees_cop,
  (select coalesce(sum(o.business_earnings),0) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::bigint as business_earnings_cop,
  (select coalesce(sum(o.courier_earnings),0) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::bigint as courier_earnings_cop,
  (select coalesce(sum(o.platform_earnings),0) from public.orders o where (coalesce(o.actual_delivery_time,o.updated_at) at time zone 'America/Bogota')::date = d.operation_date and o.status::text = 'delivered')::bigint as domiu_earnings_cop,
  (select count(*) from public.profiles p where (p.created_at at time zone 'America/Bogota')::date = d.operation_date)::integer as users_registered,
  (select count(*) from public.businesses b where (b.created_at at time zone 'America/Bogota')::date = d.operation_date)::integer as businesses_registered,
  (select count(*) from public.operational_shifts s where (s.opened_at at time zone 'America/Bogota')::date = d.operation_date and s.participant_type = 'business')::integer as business_shifts_opened,
  (select count(*) from public.operational_shifts s where (s.opened_at at time zone 'America/Bogota')::date = d.operation_date and s.participant_type = 'courier')::integer as courier_shifts_opened
from days d;

create or replace view public.merchant_catalog_quality_v
with (security_invoker = true)
as
select
  b.id as business_id,
  b.owner_id,
  b.name as business_name,
  count(p.id)::integer as total_products,
  count(p.id) filter (where p.status::text = 'available')::integer as available_products,
  count(p.id) filter (where coalesce(p.quantity_available,0) <= 0)::integer as out_of_stock_products,
  count(p.id) filter (where coalesce(p.quantity_available,0) between 1 and 5)::integer as low_stock_products,
  count(p.id) filter (where nullif(trim(coalesce(p.image_url,'')),'') is null)::integer as products_without_image,
  count(p.id) filter (where p.price is null or p.price <= 0)::integer as products_without_valid_price,
  0::integer as images_pending_review,
  count(p.id) filter (where nullif(trim(coalesce(p.image_url,'')),'') is not null)::integer as images_approved
from public.businesses b
left join public.products p on p.business_id = b.id and p.deleted_at is null
group by b.id,b.owner_id,b.name;

create table if not exists public.domi_agent_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role_scope text not null check (role_scope in ('customer','merchant','courier','admin')),
  assistant_name text not null default 'Domi',
  memory_consent boolean not null default false,
  personalization_enabled boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  behavior_summary jsonb not null default '{}'::jsonb,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.domi_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  memory_key text not null,
  memory_value jsonb not null,
  confidence numeric(4,3) not null default 0.500 check (confidence between 0 and 1),
  source_type text not null default 'interaction',
  source_reference_id uuid,
  is_sensitive boolean not null default false,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,category,memory_key)
);

create table if not exists public.catalog_image_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','brief_ready','generated','merchant_review','approved','rejected','failed')),
  product_snapshot jsonb not null default '{}'::jsonb,
  generation_brief text not null,
  negative_requirements text not null default 'No inventar marcas, ingredientes, tamaños, empaques, acompañamientos ni características no verificadas.',
  output_aspect_ratio text not null default '4:3',
  output_min_width integer not null default 1600,
  generated_image_url text,
  original_reference_url text,
  provider text,
  provider_job_id text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.domi_agent_profiles enable row level security;
alter table public.domi_memories enable row level security;
alter table public.catalog_image_jobs enable row level security;

drop policy if exists domi_agent_profiles_owner_read on public.domi_agent_profiles;
create policy domi_agent_profiles_owner_read on public.domi_agent_profiles
for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists domi_agent_profiles_owner_update on public.domi_agent_profiles;
create policy domi_agent_profiles_owner_update on public.domi_agent_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists domi_memories_owner_all on public.domi_memories;
create policy domi_memories_owner_all on public.domi_memories
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists catalog_image_jobs_owner_admin on public.catalog_image_jobs;
create policy catalog_image_jobs_owner_admin on public.catalog_image_jobs
for all to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

create or replace function public.record_courier_settlement(
  p_courier_id uuid,
  p_direction text,
  p_amount_cop bigint,
  p_reference text default null,
  p_note text default null
)
returns public.settlement_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_direction text;
  v_pending numeric := 0;
  v_result public.settlement_entries;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede registrar liquidaciones';
  end if;
  if p_amount_cop <= 0 then raise exception 'El valor debe ser mayor que cero'; end if;

  v_direction := case p_direction
    when 'company_to_courier' then 'company_owes_participant'
    when 'courier_to_company' then 'participant_owes_company'
    else null
  end;
  if v_direction is null then raise exception 'Dirección de liquidación no válida'; end if;

  select coalesce(sum(amount),0)
  into v_pending
  from public.settlement_entries
  where participant_type='courier'
    and participant_id=p_courier_id
    and direction=v_direction
    and status='pending';

  if v_pending = 0 then raise exception 'No existe saldo pendiente para esta liquidación'; end if;
  if p_amount_cop::numeric <> v_pending then
    raise exception 'Para esta fase de pruebas la liquidación debe cubrir el saldo completo: % COP', v_pending;
  end if;

  update public.settlement_entries
  set status='settled',
      settled_at=now(),
      settled_by=auth.uid(),
      description=concat_ws(' · ',nullif(description,''),nullif(trim(p_note),'')),
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('payment_reference',nullif(trim(p_reference),''),'settled_via','admin_liquidations_v1'),
      updated_at=now()
  where participant_type='courier'
    and participant_id=p_courier_id
    and direction=v_direction
    and status='pending'
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.record_courier_settlement(uuid,text,bigint,text,text) from public,anon;
grant execute on function public.record_courier_settlement(uuid,text,bigint,text,text) to authenticated,service_role;
