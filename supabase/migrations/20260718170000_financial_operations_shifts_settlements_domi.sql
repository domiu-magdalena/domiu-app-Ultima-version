-- DomiU Magdalena
-- Núcleo financiero auditable, jornadas operativas, liquidaciones y memoria de Domi.
-- Todas las cifras monetarias se guardan en COP y se calculan en servidor.

create table if not exists public.platform_financial_settings (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  service_fee_rate numeric(6,3) not null default 2.500,
  service_fee_min numeric(12,2) not null default 500,
  service_fee_max numeric(12,2) not null default 2500,
  service_fee_rounding numeric(12,2) not null default 100,
  delivery_commission_rate numeric(6,3) not null default 10.000,
  delivery_commission_min numeric(12,2) not null default 500,
  delivery_commission_max numeric(12,2) not null default 1500,
  delivery_commission_rounding numeric(12,2) not null default 100,
  merchant_product_commission_rate numeric(6,3) not null default 0,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_financial_settings_rates_check check (
    service_fee_rate >= 0 and delivery_commission_rate >= 0 and merchant_product_commission_rate >= 0
  ),
  constraint platform_financial_settings_limits_check check (
    service_fee_min >= 0 and service_fee_max >= service_fee_min and
    delivery_commission_min >= 0 and delivery_commission_max >= delivery_commission_min and
    service_fee_rounding > 0 and delivery_commission_rounding > 0
  )
);

create unique index if not exists platform_financial_settings_one_active_idx
  on public.platform_financial_settings (is_active) where is_active = true;

insert into public.platform_financial_settings (
  version, service_fee_rate, service_fee_min, service_fee_max, service_fee_rounding,
  delivery_commission_rate, delivery_commission_min, delivery_commission_max,
  delivery_commission_rounding, merchant_product_commission_rate, notes
)
values (
  '2026.07-v1', 2.500, 500, 2500, 100,
  10.000, 500, 1500, 100, 0,
  'Modelo inicial: el comercio conserva la venta neta de productos; DomiU recibe tarifa de servicio del cliente y comisión del domicilio.'
)
on conflict (version) do nothing;

alter table public.orders add column if not exists service_fee numeric(12,2) not null default 0;
alter table public.orders add column if not exists merchant_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists courier_gross_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists courier_commission numeric(12,2) not null default 0;
alter table public.orders add column if not exists courier_net_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists platform_delivery_commission numeric(12,2) not null default 0;
alter table public.orders add column if not exists platform_service_fee numeric(12,2) not null default 0;
alter table public.orders add column if not exists platform_total_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists collector_type text;
alter table public.orders add column if not exists collector_id uuid;
alter table public.orders add column if not exists financial_version text;
alter table public.orders add column if not exists financial_calculated_at timestamptz;

alter table public.businesses add column if not exists is_accepting_orders boolean not null default false;
alter table public.businesses add column if not exists operations_status text not null default 'closed';
alter table public.businesses add column if not exists opened_at timestamptz;
alter table public.businesses add column if not exists closed_at timestamptz;

update public.businesses
set is_accepting_orders = true,
    operations_status = 'open',
    opened_at = coalesce(opened_at, now()),
    closed_at = null
where is_active = true
  and is_verified = true
  and coalesce(metadata->>'catalog_status', 'live') = 'live';

create table if not exists public.operations_days (
  id uuid primary key default gen_random_uuid(),
  operation_date date not null default (now() at time zone 'America/Bogota')::date,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  opening_notes text,
  closing_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists operations_days_one_open_idx
  on public.operations_days ((status)) where status = 'open';
create unique index if not exists operations_days_date_idx
  on public.operations_days (operation_date);

insert into public.operations_days (operation_date, status, opening_notes)
select (now() at time zone 'America/Bogota')::date, 'open', 'Jornada inicial creada durante la migración operativa.'
where not exists (select 1 from public.operations_days where status = 'open');

create table if not exists public.business_shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  operation_day_id uuid references public.operations_days(id) on delete set null,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  opening_cash numeric(12,2) not null default 0,
  closing_cash numeric(12,2),
  delivered_orders integer not null default 0,
  product_sales numeric(12,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_shifts_one_open_idx
  on public.business_shifts (business_id) where status = 'open';
create index if not exists business_shifts_business_date_idx
  on public.business_shifts (business_id, opened_at desc);

insert into public.business_shifts (business_id, operation_day_id, status, opened_by, notes)
select b.id, od.id, 'open', b.owner_id, 'Turno inicial creado durante la migración.'
from public.businesses b
cross join lateral (select id from public.operations_days where status = 'open' order by opened_at desc limit 1) od
where b.is_accepting_orders = true
on conflict do nothing;

create table if not exists public.courier_shifts (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.drivers(id) on delete cascade,
  operation_day_id uuid references public.operations_days(id) on delete set null,
  status text not null default 'open' check (status in ('open','closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_latitude numeric,
  start_longitude numeric,
  end_latitude numeric,
  end_longitude numeric,
  online_minutes integer not null default 0,
  delivered_orders integer not null default 0,
  gross_delivery_value numeric(12,2) not null default 0,
  platform_commission numeric(12,2) not null default 0,
  net_earnings numeric(12,2) not null default 0,
  cash_collected numeric(12,2) not null default 0,
  company_owes_courier numeric(12,2) not null default 0,
  courier_owes_company numeric(12,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists courier_shifts_one_open_idx
  on public.courier_shifts (courier_id) where status = 'open';
create index if not exists courier_shifts_courier_date_idx
  on public.courier_shifts (courier_id, started_at desc);

create table if not exists public.order_financial_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  courier_id uuid references public.drivers(id) on delete restrict,
  payment_method public.payment_method not null,
  collector_type text not null check (collector_type in ('platform','business','courier')),
  collector_id uuid,
  product_subtotal numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  merchant_earnings numeric(12,2) not null,
  delivery_fee numeric(12,2) not null,
  courier_gross_earnings numeric(12,2) not null,
  courier_commission numeric(12,2) not null,
  courier_net_earnings numeric(12,2) not null,
  platform_service_fee numeric(12,2) not null,
  platform_delivery_commission numeric(12,2) not null,
  platform_total_earnings numeric(12,2) not null,
  customer_total numeric(12,2) not null,
  financial_version text not null,
  settlement_status text not null default 'unsettled' check (settlement_status in ('unsettled','batched','settled','cancelled')),
  settlement_batch_id uuid,
  finalized_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_financial_ledger_courier_idx
  on public.order_financial_ledger (courier_id, finalized_at desc);
create index if not exists order_financial_ledger_business_idx
  on public.order_financial_ledger (business_id, finalized_at desc);
create index if not exists order_financial_ledger_settlement_idx
  on public.order_financial_ledger (settlement_status, finalized_at desc);

create table if not exists public.settlement_batches (
  id uuid primary key default gen_random_uuid(),
  participant_type text not null check (participant_type in ('courier','business')),
  participant_id uuid not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  company_owes_participant numeric(12,2) not null default 0,
  participant_owes_company numeric(12,2) not null default 0,
  net_balance numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','paid','cancelled')),
  generated_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  paid_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlement_period_check check (period_end >= period_start)
);

create index if not exists settlement_batches_participant_idx
  on public.settlement_batches (participant_type, participant_id, created_at desc);
create index if not exists settlement_batches_status_idx
  on public.settlement_batches (status, created_at desc);

create table if not exists public.settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_batch_id uuid not null references public.settlement_batches(id) on delete cascade,
  ledger_id uuid not null references public.order_financial_ledger(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  company_owes_participant numeric(12,2) not null default 0,
  participant_owes_company numeric(12,2) not null default 0,
  net_amount numeric(12,2) generated always as (company_owes_participant - participant_owes_company) stored,
  created_at timestamptz not null default now(),
  unique (settlement_batch_id, ledger_id)
);

alter table public.order_financial_ledger
  drop constraint if exists order_financial_ledger_settlement_batch_id_fkey;
alter table public.order_financial_ledger
  add constraint order_financial_ledger_settlement_batch_id_fkey
  foreign key (settlement_batch_id) references public.settlement_batches(id) on delete set null;

create table if not exists public.domi_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  title text not null default 'Conversación con Domi',
  status text not null default 'active' check (status in ('active','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists domi_conversations_user_idx
  on public.domi_conversations (user_id, updated_at desc);

create table if not exists public.domi_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.domi_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  model text,
  tokens_input integer,
  tokens_output integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists domi_messages_conversation_idx
  on public.domi_messages (conversation_id, created_at);

create table if not exists public.domi_user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_key text not null,
  memory_value jsonb not null,
  memory_type text not null default 'preference' check (memory_type in ('preference','instruction','behavior','business_context','courier_context')),
  confidence numeric(5,4) not null default 1 check (confidence >= 0 and confidence <= 1),
  source text not null default 'explicit',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, memory_key)
);

create table if not exists public.domi_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  audience_role public.user_role,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  version text not null default '1.0',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.domi_knowledge_articles (audience_role, title, content, tags)
values
  ('customer', 'Cómo pedir en DomiU', 'Explora comercios habilitados, agrega productos, confirma una dirección exacta, revisa productos, domicilio y tarifa de servicio antes de pagar, y sigue el pedido en vivo.', array['pedidos','cliente']),
  ('merchant', 'Operación diaria del comercio', 'El comercio debe abrir su jornada para recibir pedidos. Al cerrar, deja de recibir pedidos nuevos y conserva el seguimiento de los pedidos ya aceptados.', array['jornada','negocio']),
  ('courier', 'Jornada del repartidor', 'El repartidor debe iniciar jornada y estar disponible para aceptar pedidos. Su ganancia neta es el valor del domicilio menos la comisión de operación de DomiU.', array['jornada','repartidor']),
  ('admin', 'Liquidaciones DomiU', 'Las liquidaciones comparan quién recibió el dinero del cliente con los valores que corresponden al comercio, al repartidor y a DomiU. Un saldo positivo indica que DomiU debe pagar al participante; uno negativo indica que el participante debe entregar dinero a DomiU.', array['liquidaciones','administrador'])
on conflict do nothing;

create unique index if not exists driver_earnings_order_unique_idx on public.driver_earnings(order_id);
create unique index if not exists commission_transactions_order_unique_idx on public.commission_transactions(order_id);

create or replace function public.current_financial_settings()
returns public.platform_financial_settings
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.*
  from public.platform_financial_settings s
  where s.is_active = true
    and s.effective_from <= now()
    and (s.effective_to is null or s.effective_to > now())
  order by s.effective_from desc
  limit 1
$$;

create or replace function public.round_money_up(p_value numeric, p_increment numeric)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_value, 0) <= 0 then 0
    else ceil(p_value / nullif(p_increment, 0)) * p_increment
  end
$$;

create or replace function public.set_order_financial_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.platform_financial_settings%rowtype;
  v_product_value numeric;
  v_service_fee numeric := 0;
  v_delivery_commission numeric := 0;
begin
  select * into v_settings from public.current_financial_settings();
  if v_settings.id is null then
    raise exception 'No existe una configuración financiera activa';
  end if;

  v_product_value := greatest(
    coalesce(new.subtotal, 0) - coalesce(new.discount_amount, 0) + coalesce(new.tax_amount, 0),
    0
  );

  if coalesce(new.subtotal, 0) > 0 then
    v_service_fee := public.round_money_up(
      coalesce(new.subtotal, 0) * v_settings.service_fee_rate / 100,
      v_settings.service_fee_rounding
    );
    v_service_fee := least(v_settings.service_fee_max, greatest(v_settings.service_fee_min, v_service_fee));
  end if;

  if coalesce(new.delivery_fee, 0) > 0 then
    v_delivery_commission := public.round_money_up(
      coalesce(new.delivery_fee, 0) * v_settings.delivery_commission_rate / 100,
      v_settings.delivery_commission_rounding
    );
    v_delivery_commission := least(
      coalesce(new.delivery_fee, 0),
      least(v_settings.delivery_commission_max, greatest(v_settings.delivery_commission_min, v_delivery_commission))
    );
  end if;

  new.service_fee := v_service_fee;
  new.merchant_earnings := v_product_value;
  new.courier_gross_earnings := coalesce(new.delivery_fee, 0);
  new.courier_commission := v_delivery_commission;
  new.courier_net_earnings := greatest(coalesce(new.delivery_fee, 0) - v_delivery_commission, 0);
  new.platform_delivery_commission := v_delivery_commission;
  new.platform_service_fee := v_service_fee;
  new.platform_total_earnings := v_service_fee + v_delivery_commission;
  new.courier_earnings := new.courier_net_earnings;
  new.platform_earnings := new.platform_total_earnings;
  new.total_amount := v_product_value + coalesce(new.delivery_fee, 0) + v_service_fee;
  new.collector_type := case
    when new.payment_method = 'cash' then 'courier'
    when new.payment_method = 'transfer' then 'business'
    else 'platform'
  end;
  new.collector_id := case
    when new.payment_method = 'cash' then new.courier_id
    when new.payment_method = 'transfer' then new.business_id
    else null
  end;
  new.financial_version := v_settings.version;
  new.financial_calculated_at := now();
  new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
    'financial_version', v_settings.version,
    'service_fee_label', 'Tarifa de servicio DomiU',
    'service_fee_rate', v_settings.service_fee_rate,
    'delivery_commission_rate', v_settings.delivery_commission_rate,
    'merchant_product_commission_rate', v_settings.merchant_product_commission_rate,
    'financial_calculated_at', now()
  );
  return new;
end;
$$;

create or replace function public.guard_business_receiving_orders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.operations_days where status = 'open') then
    raise exception 'DomiU no tiene una jornada operativa abierta';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = new.business_id
      and b.is_active = true
      and b.is_verified = true
      and b.is_accepting_orders = true
      and b.operations_status = 'open'
      and b.deleted_at is null
  ) then
    raise exception 'El comercio está cerrado y no puede recibir pedidos';
  end if;

  if not exists (
    select 1 from public.business_shifts bs
    where bs.business_id = new.business_id and bs.status = 'open'
  ) then
    raise exception 'El comercio no tiene una jornada abierta';
  end if;

  return new;
end;
$$;

create or replace function public.open_business_shift(p_business_id uuid, p_opening_cash numeric default 0, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shift_id uuid;
  v_operation_day_id uuid;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  if not public.is_admin() and not exists (
    select 1 from public.businesses b where b.id = p_business_id and b.owner_id = auth.uid() and b.deleted_at is null
  ) then raise exception 'No autorizado'; end if;

  select id into v_operation_day_id from public.operations_days where status = 'open' order by opened_at desc limit 1;
  if v_operation_day_id is null then raise exception 'DomiU no tiene una jornada operativa abierta'; end if;

  select id into v_shift_id from public.business_shifts where business_id = p_business_id and status = 'open' limit 1;
  if v_shift_id is not null then return v_shift_id; end if;

  insert into public.business_shifts (business_id, operation_day_id, opened_by, opening_cash, notes)
  values (p_business_id, v_operation_day_id, auth.uid(), greatest(coalesce(p_opening_cash,0),0), nullif(trim(p_notes),''))
  returning id into v_shift_id;

  update public.businesses
  set is_accepting_orders = true, operations_status = 'open', opened_at = now(), closed_at = null, updated_at = now()
  where id = p_business_id;

  return v_shift_id;
end;
$$;

create or replace function public.close_business_shift(p_business_id uuid, p_closing_cash numeric default null, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shift public.business_shifts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  if not public.is_admin() and not exists (
    select 1 from public.businesses b where b.id = p_business_id and b.owner_id = auth.uid() and b.deleted_at is null
  ) then raise exception 'No autorizado'; end if;

  select * into v_shift from public.business_shifts
  where business_id = p_business_id and status = 'open'
  order by opened_at desc limit 1 for update;
  if v_shift.id is null then raise exception 'El comercio no tiene una jornada abierta'; end if;

  update public.business_shifts bs
  set status = 'closed',
      closed_at = now(),
      closed_by = auth.uid(),
      closing_cash = p_closing_cash,
      delivered_orders = (select count(*) from public.orders o where o.business_id = p_business_id and o.status = 'delivered' and o.actual_delivery_time >= v_shift.opened_at),
      product_sales = (select coalesce(sum(o.merchant_earnings),0) from public.orders o where o.business_id = p_business_id and o.status = 'delivered' and o.actual_delivery_time >= v_shift.opened_at),
      notes = coalesce(nullif(trim(p_notes),''), bs.notes),
      updated_at = now()
  where bs.id = v_shift.id;

  update public.businesses
  set is_accepting_orders = false, operations_status = 'closed', closed_at = now(), updated_at = now()
  where id = p_business_id;

  return v_shift.id;
end;
$$;

create or replace function public.start_courier_shift(p_latitude numeric default null, p_longitude numeric default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shift_id uuid;
  v_operation_day_id uuid;
begin
  if auth.uid() is null or not public.is_courier() then raise exception 'Solo un repartidor puede iniciar jornada'; end if;
  select id into v_operation_day_id from public.operations_days where status = 'open' order by opened_at desc limit 1;
  if v_operation_day_id is null then raise exception 'DomiU no tiene una jornada operativa abierta'; end if;

  select id into v_shift_id from public.courier_shifts where courier_id = auth.uid() and status = 'open' limit 1;
  if v_shift_id is not null then return v_shift_id; end if;

  insert into public.courier_shifts (courier_id, operation_day_id, start_latitude, start_longitude)
  values (auth.uid(), v_operation_day_id, p_latitude, p_longitude)
  returning id into v_shift_id;

  update public.drivers set status = 'available', is_active = true, is_available = true, updated_at = now() where id = auth.uid();
  return v_shift_id;
end;
$$;

create or replace function public.close_courier_shift(p_latitude numeric default null, p_longitude numeric default null, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shift public.courier_shifts%rowtype;
begin
  if auth.uid() is null or not public.is_courier() then raise exception 'Solo un repartidor puede cerrar su jornada'; end if;
  if exists (
    select 1 from public.orders o
    where o.courier_id = auth.uid() and o.status in ('assigned','accepted','picked_up','in_transit')
  ) then raise exception 'No puedes cerrar jornada mientras tengas un pedido activo'; end if;

  select * into v_shift from public.courier_shifts
  where courier_id = auth.uid() and status = 'open'
  order by started_at desc limit 1 for update;
  if v_shift.id is null then raise exception 'No tienes una jornada abierta'; end if;

  update public.courier_shifts cs
  set status = 'closed',
      ended_at = now(),
      end_latitude = p_latitude,
      end_longitude = p_longitude,
      online_minutes = greatest(0, floor(extract(epoch from (now() - v_shift.started_at)) / 60)::integer),
      delivered_orders = (select count(*) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.finalized_at >= v_shift.started_at),
      gross_delivery_value = (select coalesce(sum(l.courier_gross_earnings),0) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.finalized_at >= v_shift.started_at),
      platform_commission = (select coalesce(sum(l.courier_commission),0) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.finalized_at >= v_shift.started_at),
      net_earnings = (select coalesce(sum(l.courier_net_earnings),0) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.finalized_at >= v_shift.started_at),
      cash_collected = (select coalesce(sum(l.customer_total),0) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.collector_type = 'courier' and l.finalized_at >= v_shift.started_at),
      company_owes_courier = (select coalesce(sum(case when l.collector_type <> 'courier' then l.courier_net_earnings else 0 end),0) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.finalized_at >= v_shift.started_at),
      courier_owes_company = (select coalesce(sum(case when l.collector_type = 'courier' then l.customer_total - l.courier_net_earnings else 0 end),0) from public.order_financial_ledger l where l.courier_id = auth.uid() and l.finalized_at >= v_shift.started_at),
      notes = nullif(trim(p_notes),''),
      updated_at = now()
  where cs.id = v_shift.id;

  update public.drivers set status = 'offline', is_active = false, is_available = false, updated_at = now() where id = auth.uid();
  return v_shift.id;
end;
$$;

create or replace function public.open_platform_operation(p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Solo un administrador puede abrir operaciones'; end if;
  select id into v_id from public.operations_days where status='open' limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.operations_days(operation_date,status,opened_by,opening_notes)
  values ((now() at time zone 'America/Bogota')::date,'open',auth.uid(),nullif(trim(p_notes),''))
  on conflict (operation_date) do update set status='open',opened_at=now(),closed_at=null,opened_by=auth.uid(),opening_notes=excluded.opening_notes,updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.close_platform_operation(p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Solo un administrador puede cerrar operaciones'; end if;
  select id into v_id from public.operations_days where status='open' order by opened_at desc limit 1 for update;
  if v_id is null then raise exception 'No existe una jornada operativa abierta'; end if;
  update public.operations_days set status='closed',closed_at=now(),closed_by=auth.uid(),closing_notes=nullif(trim(p_notes),''),updated_at=now() where id=v_id;
  update public.businesses set is_accepting_orders=false,operations_status='closed',closed_at=now(),updated_at=now() where is_accepting_orders=true;
  update public.business_shifts set status='closed',closed_at=now(),closed_by=auth.uid(),updated_at=now() where status='open';
  return v_id;
end;
$$;

create or replace function public.finalize_order_financial_ledger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collector_type text;
  v_collector_id uuid;
  v_ledger_id uuid;
begin
  if new.status <> 'delivered' or new.courier_id is null then return new; end if;

  v_collector_type := case when new.payment_method='cash' then 'courier' when new.payment_method='transfer' then 'business' else 'platform' end;
  v_collector_id := case when v_collector_type='courier' then new.courier_id when v_collector_type='business' then new.business_id else null end;

  insert into public.order_financial_ledger (
    order_id,business_id,courier_id,payment_method,collector_type,collector_id,
    product_subtotal,discount_amount,tax_amount,merchant_earnings,delivery_fee,
    courier_gross_earnings,courier_commission,courier_net_earnings,
    platform_service_fee,platform_delivery_commission,platform_total_earnings,
    customer_total,financial_version,finalized_at,metadata
  ) values (
    new.id,new.business_id,new.courier_id,new.payment_method,v_collector_type,v_collector_id,
    new.subtotal,coalesce(new.discount_amount,0),coalesce(new.tax_amount,0),new.merchant_earnings,new.delivery_fee,
    new.courier_gross_earnings,new.courier_commission,new.courier_net_earnings,
    new.platform_service_fee,new.platform_delivery_commission,new.platform_total_earnings,
    new.total_amount,coalesce(new.financial_version,'legacy'),coalesce(new.actual_delivery_time,now()),
    jsonb_build_object('order_number',new.order_number,'payment_status',new.payment_status)
  )
  on conflict (order_id) do update set
    business_id=excluded.business_id,courier_id=excluded.courier_id,payment_method=excluded.payment_method,
    collector_type=excluded.collector_type,collector_id=excluded.collector_id,
    product_subtotal=excluded.product_subtotal,discount_amount=excluded.discount_amount,tax_amount=excluded.tax_amount,
    merchant_earnings=excluded.merchant_earnings,delivery_fee=excluded.delivery_fee,
    courier_gross_earnings=excluded.courier_gross_earnings,courier_commission=excluded.courier_commission,
    courier_net_earnings=excluded.courier_net_earnings,platform_service_fee=excluded.platform_service_fee,
    platform_delivery_commission=excluded.platform_delivery_commission,platform_total_earnings=excluded.platform_total_earnings,
    customer_total=excluded.customer_total,financial_version=excluded.financial_version,
    finalized_at=excluded.finalized_at,updated_at=now()
  returning id into v_ledger_id;

  insert into public.driver_earnings (driver_id,order_id,base_amount,bonus_amount,penalty_amount,total_earned,status,metadata)
  values (new.courier_id,new.id,new.courier_gross_earnings,0,new.courier_commission,new.courier_net_earnings,'completed',jsonb_build_object('financial_version',new.financial_version,'ledger_id',v_ledger_id))
  on conflict (order_id) do update set
    driver_id=excluded.driver_id,base_amount=excluded.base_amount,bonus_amount=0,
    penalty_amount=excluded.penalty_amount,total_earned=excluded.total_earned,status='completed',metadata=excluded.metadata,updated_at=now();

  insert into public.commission_transactions (order_id,business_id,order_total,commission_rate,commission_amount,status)
  values (new.id,new.business_id,new.delivery_fee,
    case when new.delivery_fee>0 then round((new.platform_delivery_commission/new.delivery_fee)*100,3) else 0 end,
    new.platform_delivery_commission,'pending')
  on conflict (order_id) do update set
    business_id=excluded.business_id,order_total=excluded.order_total,commission_rate=excluded.commission_rate,
    commission_amount=excluded.commission_amount,status=case when public.commission_transactions.status='collected' then 'collected' else 'pending' end,updated_at=now();

  return new;
end;
$$;

create or replace function public.create_settlement_batch(
  p_participant_type text,
  p_participant_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch_id uuid;
  v_company_owes numeric := 0;
  v_participant_owes numeric := 0;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Solo un administrador puede generar liquidaciones'; end if;
  if p_participant_type not in ('courier','business') then raise exception 'Tipo de participante inválido'; end if;
  if p_period_end < p_period_start then raise exception 'Rango de fechas inválido'; end if;

  if p_participant_type='courier' then
    select
      coalesce(sum(case when collector_type <> 'courier' then courier_net_earnings else 0 end),0),
      coalesce(sum(case when collector_type = 'courier' then customer_total-courier_net_earnings else 0 end),0)
    into v_company_owes,v_participant_owes
    from public.order_financial_ledger
    where courier_id=p_participant_id and settlement_status='unsettled' and finalized_at between p_period_start and p_period_end;
  else
    select
      coalesce(sum(case when collector_type <> 'business' then merchant_earnings else 0 end),0),
      coalesce(sum(case when collector_type = 'business' then customer_total-merchant_earnings else 0 end),0)
    into v_company_owes,v_participant_owes
    from public.order_financial_ledger
    where business_id=p_participant_id and settlement_status='unsettled' and finalized_at between p_period_start and p_period_end;
  end if;

  if v_company_owes=0 and v_participant_owes=0 then raise exception 'No hay movimientos pendientes en el periodo'; end if;

  insert into public.settlement_batches(participant_type,participant_id,period_start,period_end,company_owes_participant,participant_owes_company,net_balance,generated_by)
  values(p_participant_type,p_participant_id,p_period_start,p_period_end,v_company_owes,v_participant_owes,v_company_owes-v_participant_owes,auth.uid())
  returning id into v_batch_id;

  if p_participant_type='courier' then
    insert into public.settlement_items(settlement_batch_id,ledger_id,order_id,company_owes_participant,participant_owes_company)
    select v_batch_id,id,order_id,
      case when collector_type <> 'courier' then courier_net_earnings else 0 end,
      case when collector_type = 'courier' then customer_total-courier_net_earnings else 0 end
    from public.order_financial_ledger
    where courier_id=p_participant_id and settlement_status='unsettled' and finalized_at between p_period_start and p_period_end;

    update public.order_financial_ledger set settlement_status='batched',settlement_batch_id=v_batch_id,updated_at=now()
    where courier_id=p_participant_id and settlement_status='unsettled' and finalized_at between p_period_start and p_period_end;
  else
    insert into public.settlement_items(settlement_batch_id,ledger_id,order_id,company_owes_participant,participant_owes_company)
    select v_batch_id,id,order_id,
      case when collector_type <> 'business' then merchant_earnings else 0 end,
      case when collector_type = 'business' then customer_total-merchant_earnings else 0 end
    from public.order_financial_ledger
    where business_id=p_participant_id and settlement_status='unsettled' and finalized_at between p_period_start and p_period_end;

    update public.order_financial_ledger set settlement_status='batched',settlement_batch_id=v_batch_id,updated_at=now()
    where business_id=p_participant_id and settlement_status='unsettled' and finalized_at between p_period_start and p_period_end;
  end if;

  return v_batch_id;
end;
$$;

create or replace function public.mark_settlement_paid(p_batch_id uuid, p_payment_reference text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Solo un administrador puede cerrar liquidaciones'; end if;
  update public.settlement_batches
  set status='paid',paid_at=now(),paid_by=auth.uid(),payment_reference=nullif(trim(p_payment_reference),''),updated_at=now()
  where id=p_batch_id and status in ('pending','approved');
  if not found then raise exception 'Liquidación no disponible para pago'; end if;
  update public.order_financial_ledger set settlement_status='settled',updated_at=now() where settlement_batch_id=p_batch_id;
end;
$$;

create or replace function public.accept_available_order(p_order_id uuid, p_courier_id uuid, p_courier_name text default 'Repartidor')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_now timestamptz := now();
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then return jsonb_build_object('success',false,'error','Pedido no encontrado'); end if;
  if v_order.courier_id is not null then
    if v_order.courier_id=p_courier_id then return jsonb_build_object('success',true,'already_accepted',true,'order_id',v_order.id,'order_number',v_order.order_number); end if;
    return jsonb_build_object('success',false,'error','El pedido ya fue tomado por otro repartidor');
  end if;
  if not (v_order.status in ('confirmed','ready') or (v_order.status='pending' and v_order.order_type='manual_delivery')) then
    return jsonb_build_object('success',false,'error','El pedido ya no está disponible');
  end if;
  if not exists (
    select 1 from public.drivers d join public.profiles p on p.id=d.id
    where d.id=p_courier_id and d.deleted_at is null and d.is_active=true and d.status='available' and d.is_available=true
      and p.role='courier' and p.status='active' and p.deleted_at is null
  ) then return jsonb_build_object('success',false,'error','Debes estar disponible para aceptar pedidos'); end if;
  if not exists (select 1 from public.courier_shifts cs where cs.courier_id=p_courier_id and cs.status='open') then
    return jsonb_build_object('success',false,'error','Debes iniciar tu jornada antes de aceptar pedidos');
  end if;

  update public.orders
  set courier_id=p_courier_id,status='accepted',
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('accepted_at',v_now,'accepted_by_name',coalesce(nullif(trim(p_courier_name),''),'Repartidor')),
      updated_at=v_now
  where id=p_order_id and courier_id is null;
  if not found then return jsonb_build_object('success',false,'error','Otro repartidor tomó el pedido primero'); end if;

  update public.drivers set status='busy',is_available=false,is_active=true,updated_at=v_now where id=p_courier_id;
  insert into public.order_tracking(order_id,status,notes,created_at)
  values(p_order_id,'accepted','Aceptado por '||coalesce(nullif(trim(p_courier_name),''),'Repartidor'),v_now);
  return jsonb_build_object('success',true,'order_id',p_order_id,'order_number',v_order.order_number,'status','accepted','courier_id',p_courier_id);
end;
$$;

drop trigger if exists auto_create_commission_trigger on public.orders;
drop trigger if exists zz_set_order_financial_breakdown_trigger on public.orders;
create trigger zz_set_order_financial_breakdown_trigger
before insert or update of subtotal,delivery_fee,discount_amount,tax_amount,payment_method,courier_id
on public.orders for each row execute function public.set_order_financial_breakdown();

drop trigger if exists zz_guard_business_receiving_orders_trigger on public.orders;
create trigger zz_guard_business_receiving_orders_trigger
before insert on public.orders for each row execute function public.guard_business_receiving_orders();

drop trigger if exists zz_finalize_order_financial_ledger_trigger on public.orders;
create trigger zz_finalize_order_financial_ledger_trigger
after insert or update of status,courier_id,payment_method,subtotal,delivery_fee,discount_amount,tax_amount
on public.orders for each row execute function public.finalize_order_financial_ledger();

create or replace view public.courier_financial_summary
with (security_invoker=true)
as
select
  l.courier_id,
  count(*) as delivered_orders,
  coalesce(sum(l.courier_gross_earnings),0)::numeric(12,2) as gross_delivery_value,
  coalesce(sum(l.courier_commission),0)::numeric(12,2) as platform_commission,
  coalesce(sum(l.courier_net_earnings),0)::numeric(12,2) as net_earnings,
  coalesce(sum(case when l.collector_type <> 'courier' and l.settlement_status <> 'settled' then l.courier_net_earnings else 0 end),0)::numeric(12,2) as company_owes_courier,
  coalesce(sum(case when l.collector_type = 'courier' and l.settlement_status <> 'settled' then l.customer_total-l.courier_net_earnings else 0 end),0)::numeric(12,2) as courier_owes_company,
  (
    coalesce(sum(case when l.collector_type <> 'courier' and l.settlement_status <> 'settled' then l.courier_net_earnings else 0 end),0)
    - coalesce(sum(case when l.collector_type = 'courier' and l.settlement_status <> 'settled' then l.customer_total-l.courier_net_earnings else 0 end),0)
  )::numeric(12,2) as net_balance
from public.order_financial_ledger l
group by l.courier_id;

create or replace view public.business_financial_summary
with (security_invoker=true)
as
select
  l.business_id,
  count(*) as delivered_orders,
  coalesce(sum(l.merchant_earnings),0)::numeric(12,2) as product_sales,
  coalesce(sum(case when l.collector_type <> 'business' and l.settlement_status <> 'settled' then l.merchant_earnings else 0 end),0)::numeric(12,2) as company_owes_business,
  coalesce(sum(case when l.collector_type = 'business' and l.settlement_status <> 'settled' then l.customer_total-l.merchant_earnings else 0 end),0)::numeric(12,2) as business_owes_company,
  (
    coalesce(sum(case when l.collector_type <> 'business' and l.settlement_status <> 'settled' then l.merchant_earnings else 0 end),0)
    - coalesce(sum(case when l.collector_type = 'business' and l.settlement_status <> 'settled' then l.customer_total-l.merchant_earnings else 0 end),0)
  )::numeric(12,2) as net_balance
from public.order_financial_ledger l
group by l.business_id;

create or replace view public.daily_platform_financial_report
with (security_invoker=true)
as
select
  (l.finalized_at at time zone 'America/Bogota')::date as operation_date,
  count(*) as delivered_orders,
  count(distinct l.business_id) as businesses_with_sales,
  count(distinct l.courier_id) as active_couriers,
  coalesce(sum(l.product_subtotal),0)::numeric(14,2) as product_sales,
  coalesce(sum(l.delivery_fee),0)::numeric(14,2) as delivery_value,
  coalesce(sum(l.courier_net_earnings),0)::numeric(14,2) as courier_net_earnings,
  coalesce(sum(l.platform_delivery_commission),0)::numeric(14,2) as platform_delivery_commission,
  coalesce(sum(l.platform_service_fee),0)::numeric(14,2) as platform_service_fees,
  coalesce(sum(l.platform_total_earnings),0)::numeric(14,2) as platform_revenue,
  coalesce(sum(l.customer_total),0)::numeric(14,2) as gross_customer_value
from public.order_financial_ledger l
group by (l.finalized_at at time zone 'America/Bogota')::date;

alter table public.platform_financial_settings enable row level security;
alter table public.operations_days enable row level security;
alter table public.business_shifts enable row level security;
alter table public.courier_shifts enable row level security;
alter table public.order_financial_ledger enable row level security;
alter table public.settlement_batches enable row level security;
alter table public.settlement_items enable row level security;
alter table public.domi_conversations enable row level security;
alter table public.domi_messages enable row level security;
alter table public.domi_user_memory enable row level security;
alter table public.domi_knowledge_articles enable row level security;

drop policy if exists "Admins manage financial settings" on public.platform_financial_settings;
create policy "Admins manage financial settings" on public.platform_financial_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Authenticated read active financial settings" on public.platform_financial_settings;
create policy "Authenticated read active financial settings" on public.platform_financial_settings for select to authenticated using (is_active=true);

drop policy if exists "Authenticated read operations" on public.operations_days;
create policy "Authenticated read operations" on public.operations_days for select to authenticated using (true);
drop policy if exists "Admins manage operations" on public.operations_days;
create policy "Admins manage operations" on public.operations_days for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Business participants read shifts" on public.business_shifts;
create policy "Business participants read shifts" on public.business_shifts for select to authenticated using (
  public.is_admin() or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())
);
drop policy if exists "Couriers read own shifts" on public.courier_shifts;
create policy "Couriers read own shifts" on public.courier_shifts for select to authenticated using (public.is_admin() or courier_id=auth.uid());

drop policy if exists "Financial participants read ledger" on public.order_financial_ledger;
create policy "Financial participants read ledger" on public.order_financial_ledger for select to authenticated using (
  public.is_admin() or courier_id=auth.uid() or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())
);
drop policy if exists "Admins manage ledger" on public.order_financial_ledger;
create policy "Admins manage ledger" on public.order_financial_ledger for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Participants read settlements" on public.settlement_batches;
create policy "Participants read settlements" on public.settlement_batches for select to authenticated using (
  public.is_admin() or
  (participant_type='courier' and participant_id=auth.uid()) or
  (participant_type='business' and exists(select 1 from public.businesses b where b.id=participant_id and b.owner_id=auth.uid()))
);
drop policy if exists "Admins manage settlements" on public.settlement_batches;
create policy "Admins manage settlements" on public.settlement_batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Participants read settlement items" on public.settlement_items;
create policy "Participants read settlement items" on public.settlement_items for select to authenticated using (
  exists(select 1 from public.settlement_batches sb where sb.id=settlement_batch_id and (
    public.is_admin() or (sb.participant_type='courier' and sb.participant_id=auth.uid()) or
    (sb.participant_type='business' and exists(select 1 from public.businesses b where b.id=sb.participant_id and b.owner_id=auth.uid()))
  ))
);

drop policy if exists "Users manage own Domi conversations" on public.domi_conversations;
create policy "Users manage own Domi conversations" on public.domi_conversations for all to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists "Users manage own Domi messages" on public.domi_messages;
create policy "Users manage own Domi messages" on public.domi_messages for all to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists "Users manage own Domi memory" on public.domi_user_memory;
create policy "Users manage own Domi memory" on public.domi_user_memory for all to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists "Authenticated read Domi knowledge" on public.domi_knowledge_articles;
create policy "Authenticated read Domi knowledge" on public.domi_knowledge_articles for select to authenticated using (is_active=true and (audience_role is null or audience_role=(select role from public.profiles where id=auth.uid())));
drop policy if exists "Admins manage Domi knowledge" on public.domi_knowledge_articles;
create policy "Admins manage Domi knowledge" on public.domi_knowledge_articles for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.courier_financial_summary to authenticated;
grant select on public.business_financial_summary to authenticated;
grant select on public.daily_platform_financial_report to authenticated;

revoke all on function public.current_financial_settings() from public, anon, authenticated;
grant execute on function public.current_financial_settings() to service_role;
revoke all on function public.set_order_financial_breakdown() from public, anon, authenticated;
grant execute on function public.set_order_financial_breakdown() to service_role;
revoke all on function public.guard_business_receiving_orders() from public, anon, authenticated;
grant execute on function public.guard_business_receiving_orders() to service_role;
revoke all on function public.finalize_order_financial_ledger() from public, anon, authenticated;
grant execute on function public.finalize_order_financial_ledger() to service_role;
revoke all on function public.accept_available_order(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.accept_available_order(uuid,uuid,text) to service_role;

revoke all on function public.open_business_shift(uuid,numeric,text) from public, anon;
grant execute on function public.open_business_shift(uuid,numeric,text) to authenticated, service_role;
revoke all on function public.close_business_shift(uuid,numeric,text) from public, anon;
grant execute on function public.close_business_shift(uuid,numeric,text) to authenticated, service_role;
revoke all on function public.start_courier_shift(numeric,numeric) from public, anon;
grant execute on function public.start_courier_shift(numeric,numeric) to authenticated, service_role;
revoke all on function public.close_courier_shift(numeric,numeric,text) from public, anon;
grant execute on function public.close_courier_shift(numeric,numeric,text) to authenticated, service_role;
revoke all on function public.open_platform_operation(text) from public, anon;
grant execute on function public.open_platform_operation(text) to authenticated, service_role;
revoke all on function public.close_platform_operation(text) from public, anon;
grant execute on function public.close_platform_operation(text) to authenticated, service_role;
revoke all on function public.create_settlement_batch(text,uuid,timestamptz,timestamptz) from public, anon;
grant execute on function public.create_settlement_batch(text,uuid,timestamptz,timestamptz) to authenticated, service_role;
revoke all on function public.mark_settlement_paid(uuid,text) from public, anon;
grant execute on function public.mark_settlement_paid(uuid,text) to authenticated, service_role;
