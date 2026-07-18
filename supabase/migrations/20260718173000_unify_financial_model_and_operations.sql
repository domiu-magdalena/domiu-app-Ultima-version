-- DomiU Magdalena
-- Unifica el cálculo financiero en una sola fórmula y evita que dos triggers
-- calculen porcentajes diferentes sobre el mismo pedido.

create table if not exists public.platform_financial_settings (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  service_fee_rate numeric(7,3) not null default 2.500,
  service_fee_min numeric(12,2) not null default 500,
  service_fee_max numeric(12,2) not null default 2500,
  service_fee_rounding numeric(12,2) not null default 100,
  delivery_commission_rate numeric(7,3) not null default 10.000,
  delivery_commission_min numeric(12,2) not null default 500,
  delivery_commission_max numeric(12,2) not null default 1500,
  delivery_commission_rounding numeric(12,2) not null default 100,
  merchant_product_commission_rate numeric(7,3) not null default 0,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_financial_settings_one_active_idx
  on public.platform_financial_settings ((is_active)) where is_active=true;

insert into public.platform_financial_settings (
  version,service_fee_rate,service_fee_min,service_fee_max,service_fee_rounding,
  delivery_commission_rate,delivery_commission_min,delivery_commission_max,
  delivery_commission_rounding,merchant_product_commission_rate,is_active,notes
)
select
  '2026.07-pilot-90-10-2.5',2.500,500,2500,100,
  10.000,500,1500,100,0,true,
  'Piloto: repartidor conserva el domicilio menos comisión DomiU del 10%; tarifa de servicio transparente del 2,5%; comercio sin comisión sobre productos.'
where not exists(select 1 from public.platform_financial_settings where is_active=true);

update public.platform_financial_settings
set service_fee_rate=2.500,
    service_fee_min=500,
    service_fee_max=2500,
    service_fee_rounding=100,
    delivery_commission_rate=10.000,
    delivery_commission_min=500,
    delivery_commission_max=1500,
    delivery_commission_rounding=100,
    merchant_product_commission_rate=0,
    version='2026.07-pilot-90-10-2.5',
    notes='Piloto: repartidor conserva el domicilio menos comisión DomiU del 10%; tarifa de servicio transparente del 2,5%; comercio sin comisión sobre productos.',
    updated_at=now()
where is_active=true;

update public.platform_financial_config
set courier_share_bps=9000,
    service_fee_bps=250,
    service_fee_min=500,
    service_fee_max=2500,
    service_fee_rounding=100,
    business_product_commission_bps=0,
    name='Modelo piloto unificado 90/10 + servicio 2,5%',
    updated_at=now()
where is_active=true;

alter table public.orders add column if not exists merchant_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists courier_gross_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists courier_commission numeric(12,2) not null default 0;
alter table public.orders add column if not exists courier_net_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists platform_service_fee numeric(12,2) not null default 0;
alter table public.orders add column if not exists platform_total_earnings numeric(12,2) not null default 0;
alter table public.orders add column if not exists collector_type text;
alter table public.orders add column if not exists collector_id uuid;
alter table public.orders add column if not exists financial_version text;

create or replace function public.round_money_up(p_amount numeric,p_increment numeric)
returns numeric
language sql
immutable
strict
as $$
  select case when p_increment<=0 then round(p_amount,0) else ceil(p_amount/p_increment)*p_increment end;
$$;

create or replace function public.current_financial_settings()
returns public.platform_financial_settings
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select s
  from public.platform_financial_settings s
  where s.is_active=true
    and s.effective_from<=now()
    and (s.effective_to is null or s.effective_to>now())
  order by s.effective_from desc
  limit 1;
$$;

create or replace function public.set_order_financial_breakdown()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_settings public.platform_financial_settings%rowtype;
  v_config_id uuid;
  v_product_value numeric;
  v_service_fee numeric:=0;
  v_delivery_commission numeric:=0;
begin
  select * into v_settings from public.current_financial_settings();
  if v_settings.id is null then raise exception 'No existe una configuración financiera activa'; end if;
  select id into v_config_id
  from public.platform_financial_config
  where is_active=true
  order by effective_from desc
  limit 1;

  v_product_value:=greatest(
    coalesce(new.subtotal,0)-coalesce(new.discount_amount,0)+coalesce(new.tax_amount,0),
    0
  );

  if coalesce(new.subtotal,0)>0 then
    v_service_fee:=public.round_money_up(
      greatest(coalesce(new.subtotal,0)-coalesce(new.discount_amount,0),0)
      * v_settings.service_fee_rate / 100,
      v_settings.service_fee_rounding
    );
    v_service_fee:=least(v_settings.service_fee_max,greatest(v_settings.service_fee_min,v_service_fee));
  end if;

  if coalesce(new.delivery_fee,0)>0 then
    v_delivery_commission:=public.round_money_up(
      coalesce(new.delivery_fee,0)*v_settings.delivery_commission_rate/100,
      v_settings.delivery_commission_rounding
    );
    v_delivery_commission:=least(
      coalesce(new.delivery_fee,0),
      least(v_settings.delivery_commission_max,greatest(v_settings.delivery_commission_min,v_delivery_commission))
    );
  end if;

  new.service_fee:=v_service_fee;
  new.business_earnings:=v_product_value;
  new.merchant_earnings:=v_product_value;
  new.courier_gross_earnings:=coalesce(new.delivery_fee,0);
  new.courier_commission:=v_delivery_commission;
  new.courier_net_earnings:=greatest(coalesce(new.delivery_fee,0)-v_delivery_commission,0);
  new.platform_delivery_commission:=v_delivery_commission;
  new.platform_service_fee:=v_service_fee;
  new.platform_total_earnings:=v_service_fee+v_delivery_commission;
  new.courier_earnings:=new.courier_net_earnings;
  new.platform_earnings:=new.platform_total_earnings;
  new.total_amount:=v_product_value+coalesce(new.delivery_fee,0)+v_service_fee;
  new.collector_type:=case
    when new.payment_method::text='cash' then 'courier'
    when new.payment_method::text='transfer' then 'business'
    else 'platform'
  end;
  new.collector_id:=case
    when new.payment_method::text='cash' then new.courier_id
    when new.payment_method::text='transfer' then new.business_id
    else null
  end;
  new.financial_version:=v_settings.version;
  new.financial_config_id:=v_config_id;
  new.financial_calculated_at:=now();
  new.metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object(
    'financial_version',v_settings.version,
    'service_fee_label','Tarifa de servicio DomiU',
    'service_fee_rate',v_settings.service_fee_rate,
    'delivery_commission_rate',v_settings.delivery_commission_rate,
    'courier_share_rate',100-v_settings.delivery_commission_rate,
    'merchant_product_commission_rate',v_settings.merchant_product_commission_rate,
    'financial_calculated_at',now()
  );
  return new;
end;
$$;

-- El trigger financiero se ordena después del trigger que calcula ruta y domicilio.
drop trigger if exists zz_set_order_financial_breakdown_trigger on public.orders;
create trigger zz_set_order_financial_breakdown_trigger
before insert or update of subtotal,discount_amount,tax_amount,delivery_fee,payment_method,courier_id
on public.orders
for each row execute function public.set_order_financial_breakdown();

-- Compatibilidad con la interfaz operacional nueva y los turnos canónicos existentes.
create or replace function public.open_business_operation(p_business_id uuid,p_note text default null)
returns public.operational_shifts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_shift public.operational_shifts;
  v_name text;
  v_business_shift_id uuid;
begin
  if not (public.is_admin() or public.is_business_owner(p_business_id)) then
    raise exception 'No tienes permiso para abrir la operación de este comercio';
  end if;

  select name into v_name
  from public.businesses
  where id=p_business_id and is_active=true and deleted_at is null;
  if v_name is null then raise exception 'Comercio no disponible'; end if;

  if to_regprocedure('public.open_business_shift(uuid,numeric,text)') is not null then
    v_business_shift_id:=public.open_business_shift(p_business_id,0,p_note);
  end if;

  select * into v_shift
  from public.operational_shifts
  where participant_type='business' and participant_id=p_business_id and status='open'
  order by opened_at desc limit 1;

  if v_shift.id is null then
    insert into public.operational_shifts(
      participant_type,participant_id,participant_name,opened_by,opening_note,metadata
    ) values (
      'business',p_business_id,v_name,auth.uid(),nullif(trim(p_note),''),
      jsonb_build_object('business_shift_id',v_business_shift_id)
    ) returning * into v_shift;
  end if;

  update public.businesses
  set is_accepting_orders=true,
      operations_status='open',
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'accepting_orders',true,
        'operational_open',true,
        'operational_shift_id',v_shift.id,
        'business_shift_id',v_business_shift_id,
        'operational_opened_at',v_shift.opened_at
      ),
      updated_at=now()
  where id=p_business_id;
  return v_shift;
end;
$$;

create or replace function public.close_business_operation(p_business_id uuid,p_note text default null)
returns public.operational_shifts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_shift public.operational_shifts;
  v_now timestamptz:=now();
  v_orders integer:=0;
  v_product_sales numeric:=0;
  v_delivery_fees numeric:=0;
  v_service_fees numeric:=0;
  v_platform numeric:=0;
  v_cash numeric:=0;
  v_electronic numeric:=0;
begin
  if not (public.is_admin() or public.is_business_owner(p_business_id)) then
    raise exception 'No tienes permiso para cerrar la operación de este comercio';
  end if;
  if exists(
    select 1 from public.orders
    where business_id=p_business_id
      and status::text in ('pending','confirmed','preparing','ready','assigned','accepted','picked_up','in_transit')
      and deleted_at is null
  ) then
    raise exception 'No puedes cerrar la jornada mientras existan pedidos activos';
  end if;

  select * into v_shift
  from public.operational_shifts
  where participant_type='business' and participant_id=p_business_id and status='open'
  order by opened_at desc limit 1 for update;
  if v_shift.id is null then raise exception 'El comercio no tiene una jornada abierta'; end if;

  if to_regprocedure('public.close_business_shift(uuid,uuid,text)') is not null then
    perform public.close_business_shift(p_business_id,null,p_note);
  end if;

  select count(*),coalesce(sum(business_earnings),0),coalesce(sum(delivery_fee),0),
    coalesce(sum(service_fee),0),coalesce(sum(platform_earnings),0),
    coalesce(sum(case when payment_method::text='cash' then total_amount else 0 end),0),
    coalesce(sum(case when payment_method::text<>'cash' then total_amount else 0 end),0)
  into v_orders,v_product_sales,v_delivery_fees,v_service_fees,v_platform,v_cash,v_electronic
  from public.orders
  where business_id=p_business_id
    and status::text='delivered'
    and coalesce(actual_delivery_time,updated_at)>=v_shift.opened_at
    and coalesce(actual_delivery_time,updated_at)<=v_now;

  update public.operational_shifts
  set closed_at=v_now,
      closed_by=auth.uid(),
      status='closed',
      online_seconds=greatest(0,extract(epoch from(v_now-opened_at))::bigint),
      orders_count=v_orders,
      product_sales=v_product_sales,
      delivery_fees=v_delivery_fees,
      service_fees=v_service_fees,
      platform_earnings=v_platform,
      cash_collected=v_cash,
      electronic_collected=v_electronic,
      company_owes_participant=v_product_sales,
      participant_owes_company=0,
      net_balance=v_product_sales,
      closing_note=nullif(trim(p_note),''),
      updated_at=now()
  where id=v_shift.id
  returning * into v_shift;

  update public.businesses
  set is_accepting_orders=false,
      operations_status='closed',
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'accepting_orders',false,
        'operational_open',false,
        'operational_shift_id',null,
        'business_shift_id',null,
        'operational_closed_at',v_now
      ),
      updated_at=now()
  where id=p_business_id;
  return v_shift;
end;
$$;

create or replace function public.open_courier_operation(p_courier_id uuid default auth.uid(),p_note text default null)
returns public.operational_shifts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_shift public.operational_shifts;
  v_name text;
  v_courier_shift_id uuid;
begin
  if p_courier_id is null or not (public.is_admin() or auth.uid()=p_courier_id) then
    raise exception 'No tienes permiso para abrir esta jornada';
  end if;
  if not exists(select 1 from public.drivers where id=p_courier_id and deleted_at is null) then
    raise exception 'Repartidor no disponible';
  end if;
  if to_regclass('public.operations_days') is not null
     and not exists(select 1 from public.operations_days where status='open') then
    raise exception 'DomiU no tiene una jornada operativa abierta';
  end if;

  if auth.uid()=p_courier_id and to_regprocedure('public.start_courier_shift(uuid,text)') is not null then
    v_courier_shift_id:=public.start_courier_shift(null,null);
  end if;

  select trim(concat_ws(' ',first_name,last_name)) into v_name
  from public.profiles where id=p_courier_id;
  v_name:=coalesce(nullif(v_name,''),'Repartidor DomiU');

  select * into v_shift
  from public.operational_shifts
  where participant_type='courier' and participant_id=p_courier_id and status='open'
  order by opened_at desc limit 1;

  if v_shift.id is null then
    insert into public.operational_shifts(
      participant_type,participant_id,participant_name,opened_by,opening_note,metadata
    ) values (
      'courier',p_courier_id,v_name,auth.uid(),nullif(trim(p_note),''),
      jsonb_build_object('courier_shift_id',v_courier_shift_id)
    ) returning * into v_shift;
  end if;

  update public.drivers
  set status='available',is_active=true,is_available=true,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'operational_shift_id',v_shift.id,
        'courier_shift_id',v_courier_shift_id,
        'operational_opened_at',v_shift.opened_at
      ),
      updated_at=now()
  where id=p_courier_id;
  return v_shift;
end;
$$;

create or replace function public.close_courier_operation(p_courier_id uuid default auth.uid(),p_note text default null)
returns public.operational_shifts
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_shift public.operational_shifts;
  v_now timestamptz:=now();
  v_company_owes numeric:=0;
  v_participant_owes numeric:=0;
  v_orders integer:=0;
  v_delivery_fees numeric:=0;
  v_courier_earnings numeric:=0;
  v_platform numeric:=0;
  v_cash numeric:=0;
begin
  if p_courier_id is null or not (public.is_admin() or auth.uid()=p_courier_id) then
    raise exception 'No tienes permiso para cerrar esta jornada';
  end if;
  if exists(
    select 1 from public.orders
    where courier_id=p_courier_id
      and status::text in ('assigned','accepted','picked_up','in_transit')
      and deleted_at is null
  ) then
    raise exception 'No puedes cerrar la jornada mientras tengas un domicilio activo';
  end if;

  select * into v_shift
  from public.operational_shifts
  where participant_type='courier' and participant_id=p_courier_id and status='open'
  order by opened_at desc limit 1 for update;
  if v_shift.id is null then raise exception 'El repartidor no tiene una jornada abierta'; end if;

  if auth.uid()=p_courier_id and to_regprocedure('public.close_courier_shift(uuid,text,text)') is not null then
    perform public.close_courier_shift(null,null,p_note);
  end if;

  select count(*),coalesce(sum(delivery_fee),0),coalesce(sum(courier_earnings),0),
    coalesce(sum(platform_delivery_commission),0),
    coalesce(sum(case when payment_method::text='cash' then total_amount else 0 end),0)
  into v_orders,v_delivery_fees,v_courier_earnings,v_platform,v_cash
  from public.orders
  where courier_id=p_courier_id
    and status::text='delivered'
    and coalesce(actual_delivery_time,updated_at)>=v_shift.opened_at
    and coalesce(actual_delivery_time,updated_at)<=v_now;

  select
    coalesce(sum(case when direction='company_owes_participant' and status='pending' then amount else 0 end),0),
    coalesce(sum(case when direction='participant_owes_company' and status='pending' then amount else 0 end),0)
  into v_company_owes,v_participant_owes
  from public.settlement_entries
  where participant_type='courier' and participant_id=p_courier_id and shift_id=v_shift.id;

  update public.operational_shifts
  set closed_at=v_now,
      closed_by=auth.uid(),
      status='closed',
      online_seconds=greatest(0,extract(epoch from(v_now-opened_at))::bigint),
      orders_count=v_orders,
      delivery_fees=v_delivery_fees,
      courier_earnings=v_courier_earnings,
      platform_earnings=v_platform,
      cash_collected=v_cash,
      company_owes_participant=v_company_owes,
      participant_owes_company=v_participant_owes,
      net_balance=v_company_owes-v_participant_owes,
      closing_note=nullif(trim(p_note),''),
      updated_at=now()
  where id=v_shift.id
  returning * into v_shift;

  update public.drivers
  set status='offline',is_active=false,is_available=false,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'operational_shift_id',null,
        'courier_shift_id',null,
        'operational_closed_at',v_now
      ),
      updated_at=now()
  where id=p_courier_id;
  return v_shift;
end;
$$;

revoke all on function public.current_financial_settings() from public,anon;
revoke all on function public.set_order_financial_breakdown() from public,anon,authenticated;
revoke all on function public.open_business_operation(uuid,text) from public,anon;
revoke all on function public.close_business_operation(uuid,text) from public,anon;
revoke all on function public.open_courier_operation(uuid,text) from public,anon;
revoke all on function public.close_courier_operation(uuid,text) from public,anon;
grant execute on function public.current_financial_settings() to authenticated,service_role;
grant execute on function public.open_business_operation(uuid,text) to authenticated;
grant execute on function public.close_business_operation(uuid,text) to authenticated;
grant execute on function public.open_courier_operation(uuid,text) to authenticated;
grant execute on function public.close_courier_operation(uuid,text) to authenticated;
