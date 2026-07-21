-- DomiU Magdalena — pedidos manuales integrados y transaccionales
-- Permite clientes invitados sin crear cuentas de autenticación, conserva snapshots,
-- valida catálogo e inventario en PostgreSQL y protege la creación con idempotencia.

begin;

alter table public.orders alter column customer_id drop not null;
alter table public.orders alter column delivery_address_id drop not null;
alter table public.addresses alter column user_id drop not null;
alter table public.payment_transactions alter column customer_id drop not null;
alter table public.order_items alter column product_id drop not null;

alter table public.orders
  add column if not exists created_manually boolean not null default false,
  add column if not exists creation_source text,
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists created_by_role text,
  add column if not exists created_from_panel text,
  add column if not exists business_address_id uuid references public.business_addresses(id) on delete set null,
  add column if not exists guest_customer_name text,
  add column if not exists guest_customer_phone text,
  add column if not exists guest_customer_email text,
  add column if not exists customer_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists delivery_address_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists business_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists sales_channel text,
  add column if not exists sales_channel_detail text,
  add column if not exists delivery_type text not null default 'delivery',
  add column if not exists delivery_fee_source text,
  add column if not exists delivery_fee_overridden boolean not null default false,
  add column if not exists delivery_fee_override_reason text,
  add column if not exists kitchen_notes text,
  add column if not exists courier_notes text,
  add column if not exists internal_notes text,
  add column if not exists payment_notes text,
  add column if not exists amount_paid numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'COP',
  add column if not exists idempotency_key text,
  add column if not exists request_fingerprint text,
  add column if not exists administrative_reason text,
  add column if not exists confirmed_at timestamptz;

-- Una columna generada evita divergencias entre el total y el saldo pendiente.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='amount_due'
  ) then
    alter table public.orders
      add column amount_due numeric(14,2)
      generated always as (greatest(total_amount - amount_paid, 0::numeric)) stored;
  end if;
end $$;

alter table public.order_items
  add column if not exists product_name_snapshot text,
  add column if not exists product_sku_snapshot text,
  add column if not exists variant_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists modifiers_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists is_custom_item boolean not null default false,
  add column if not exists custom_description text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Constraints de integridad agregadas de forma idempotente.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='orders_manual_creation_source_check') then
    alter table public.orders add constraint orders_manual_creation_source_check
      check (creation_source is null or creation_source in ('customer_app','admin_manual','business_manual','system'));
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_manual_panel_check') then
    alter table public.orders add constraint orders_manual_panel_check
      check (created_from_panel is null or created_from_panel in ('customer','admin','business','system'));
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_sales_channel_check') then
    alter table public.orders add constraint orders_sales_channel_check
      check (sales_channel is null or sales_channel in ('whatsapp','phone','in_person','instagram','facebook','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_delivery_type_check') then
    alter table public.orders add constraint orders_delivery_type_check
      check (delivery_type in ('delivery','pickup'));
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_delivery_fee_source_check') then
    alter table public.orders add constraint orders_delivery_fee_source_check
      check (delivery_fee_source is null or delivery_fee_source in ('automatic','google_maps','postgis','manual_override','pickup'));
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_manual_amount_paid_check') then
    alter table public.orders add constraint orders_manual_amount_paid_check
      check (amount_paid >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_manual_currency_check') then
    alter table public.orders add constraint orders_manual_currency_check
      check (currency = 'COP');
  end if;
  if not exists (select 1 from pg_constraint where conname='order_items_manual_product_check') then
    alter table public.order_items add constraint order_items_manual_product_check
      check ((is_custom_item and product_id is null and length(trim(coalesce(product_name_snapshot,''))) >= 2)
          or (not is_custom_item and product_id is not null));
  end if;
end $$;

create unique index if not exists orders_manual_idempotency_unique
  on public.orders(created_by_user_id, idempotency_key)
  where created_manually=true and idempotency_key is not null and deleted_at is null;
create index if not exists orders_manual_business_created_idx
  on public.orders(business_id, created_at desc) where created_manually=true and deleted_at is null;
create index if not exists orders_manual_guest_phone_idx
  on public.orders(guest_customer_phone) where created_manually=true and guest_customer_phone is not null and deleted_at is null;
create index if not exists order_items_order_manual_idx on public.order_items(order_id, is_custom_item);

create table if not exists public.manual_order_drafts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  actor_role text not null check (actor_role in ('admin','merchant')),
  business_id uuid not null references public.businesses(id) on delete cascade,
  business_address_id uuid references public.business_addresses(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','confirmed','discarded','expired')),
  version integer not null default 1 check (version > 0),
  expires_at timestamptz not null default (now() + interval '14 days'),
  confirmed_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manual_order_drafts_actor_idx
  on public.manual_order_drafts(actor_id, updated_at desc) where status='draft';
create index if not exists manual_order_drafts_expiry_idx
  on public.manual_order_drafts(expires_at) where status='draft';

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (reason in ('manual_order_confirmed','order_cancelled','admin_adjustment')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);
create index if not exists inventory_movements_order_idx on public.inventory_movements(order_id);

alter table public.manual_order_drafts enable row level security;
alter table public.inventory_movements enable row level security;

revoke all on public.manual_order_drafts from anon;
revoke all on public.inventory_movements from anon;
grant select, insert, update, delete on public.manual_order_drafts to authenticated;
grant select on public.inventory_movements to authenticated;

drop policy if exists "Manual order actors manage own drafts" on public.manual_order_drafts;
create policy "Manual order actors manage own drafts"
  on public.manual_order_drafts for all to authenticated
  using (
    actor_id = (select auth.uid())
    and (
      public.is_admin()
      or exists (
        select 1 from public.businesses b
        where b.id=manual_order_drafts.business_id
          and b.owner_id=(select auth.uid())
          and b.deleted_at is null
      )
    )
  )
  with check (
    actor_id = (select auth.uid())
    and (
      public.is_admin()
      or exists (
        select 1 from public.businesses b
        where b.id=manual_order_drafts.business_id
          and b.owner_id=(select auth.uid())
          and b.deleted_at is null
      )
    )
  );

drop policy if exists "Authorized actors read inventory movements" on public.inventory_movements;
create policy "Authorized actors read inventory movements"
  on public.inventory_movements for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      join public.businesses b on b.id=p.business_id
      where p.id=inventory_movements.product_id
        and b.owner_id=(select auth.uid())
    )
  );

-- Los pedidos manuales recibidos fuera de la aplicación pueden registrarse aunque
-- el canal digital del comercio esté cerrado. El negocio debe seguir activo.
create or replace function public.guard_business_receiving_orders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.created_manually,false) then
    if not exists (
      select 1 from public.businesses b
      where b.id=new.business_id and b.is_active=true and b.deleted_at is null
    ) then
      raise exception 'El comercio está inactivo y no puede recibir pedidos';
    end if;
    return new;
  end if;

  if not exists(select 1 from public.operations_days where status='open') then
    raise exception 'DomiU no tiene una jornada operativa abierta';
  end if;
  if not exists(
    select 1 from public.businesses b
    where b.id=new.business_id and b.is_active=true and b.is_verified=true
      and b.is_accepting_orders=true and b.operations_status='open' and b.deleted_at is null
  ) then
    raise exception 'El comercio está cerrado y no puede recibir pedidos';
  end if;
  if not exists(select 1 from public.business_shifts bs where bs.business_id=new.business_id and bs.status='open') then
    raise exception 'El comercio no tiene una jornada abierta';
  end if;
  return new;
end;
$$;

-- Extiende el cálculo existente para recogida en local y sobrescrituras auditadas.
create or replace function public.set_order_delivery_pricing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote record;
  v_pickup public.business_addresses%rowtype;
  v_delivery public.addresses%rowtype;
  v_prep integer := 15;
  v_use_server_route boolean := false;
  v_distance double precision := 0;
  v_duration integer := 0;
  v_fee numeric := 0;
  v_settings public.delivery_pricing_settings%rowtype;
  v_raw numeric;
  v_business_live boolean := false;
begin
  if coalesce(new.order_type, 'product_order') = 'product_order' then
    select exists (
      select 1 from public.businesses b
      where b.id=new.business_id
        and b.is_active=true and b.is_verified=true and b.is_accepting_orders=true
        and b.operations_status='open' and b.deleted_at is null
        and coalesce((b.metadata->>'accepting_orders')::boolean,false)=true
        and coalesce((b.metadata->>'operational_open')::boolean,false)=true
        and exists(select 1 from public.business_shifts bs where bs.business_id=b.id and bs.status='open')
        and exists(select 1 from public.operational_shifts os where os.participant_type='business' and os.participant_id=b.id and os.status='open')
        and exists(select 1 from public.operations_days od where od.status='open')
    ) into v_business_live;
    if not v_business_live then
      raise exception 'El comercio está cerrado o no tiene una jornada operativa abierta';
    end if;
  end if;

  if new.pickup_address_id is not null then
    select * into v_pickup from public.business_addresses
    where id=new.pickup_address_id and business_id=new.business_id
      and deleted_at is null and is_active=true;
  else
    select * into v_pickup from public.business_addresses
    where business_id=new.business_id and is_primary=true
      and deleted_at is null and is_active=true
    order by updated_at desc nulls last limit 1;
    new.pickup_address_id:=v_pickup.id;
  end if;
  if v_pickup.id is null then
    raise exception 'Selecciona una sucursal activa con ubicación registrada';
  end if;

  select coalesce((b.metadata->>'avgPrepTimeMinutes')::integer,(b.metadata->>'avg_prep_time_minutes')::integer,15)
    into v_prep from public.businesses b where b.id=new.business_id;

  new.pickup_address:=coalesce(v_pickup.formatted_address,concat_ws(', ',v_pickup.street_address,v_pickup.city,v_pickup.state_province));
  new.pickup_lat:=v_pickup.latitude::double precision;
  new.pickup_lng:=v_pickup.longitude::double precision;
  new.pickup_place_id:=v_pickup.place_id;
  new.business_address_id:=v_pickup.id;

  if coalesce(new.delivery_type,'delivery')='pickup' then
    new.delivery_fee:=0;
    new.delivery_distance_km:=0;
    new.route_distance_km:=0;
    new.route_duration_minutes:=0;
    new.route_source:='pickup';
    new.delivery_fee_source:='pickup';
    new.estimated_delivery_time:=now()+make_interval(mins=>greatest(5,coalesce(v_prep,15)));
    new.metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object(
      'delivery_duration_minutes',0,
      'delivery_pricing_source','pickup',
      'delivery_pricing_calculated_at',now(),
      'pickup_address_id',v_pickup.id,
      'delivery_location_status','pickup'
    );
    return new;
  end if;

  select * into v_delivery from public.addresses where id=new.delivery_address_id and deleted_at is null;
  if v_delivery.id is null then
    raise exception 'Dirección de entrega no disponible';
  end if;

  select * into v_quote from public.delivery_quote_values_v2(v_pickup.id,v_delivery.id);
  select * into v_settings from public.delivery_pricing_settings where is_active=true order by updated_at desc limit 1;

  v_use_server_route:=coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    and new.route_distance_km is not null and new.route_distance_km>0
    and new.route_source in ('google_routes','google_maps','osrm','google_directions');

  if v_use_server_route then
    v_distance:=new.route_distance_km;
    v_duration:=greatest(v_settings.minimum_duration_minutes,coalesce(new.route_duration_minutes,v_quote.duration_minutes));
  else
    v_distance:=v_quote.distance_km;
    v_duration:=v_quote.duration_minutes;
    new.route_distance_km:=v_distance;
    new.route_duration_minutes:=v_duration;
    new.route_source:=coalesce(new.route_source,'postgis_direct');
  end if;

  if coalesce(new.delivery_fee_overridden,false) then
    if coalesce(new.delivery_fee,0)<=0 or length(trim(coalesce(new.delivery_fee_override_reason,'')))<5 then
      raise exception 'La tarifa manual requiere un valor válido y un motivo';
    end if;
    v_fee:=new.delivery_fee;
    new.delivery_fee_source:='manual_override';
  else
    v_raw:=v_settings.base_fee+greatest(v_distance-v_settings.base_distance_km,0)*v_settings.extra_per_km;
    v_fee:=case
      when v_distance<=v_settings.base_distance_km then v_settings.base_fee
      else ceil(v_raw/v_settings.rounding_increment)*v_settings.rounding_increment
    end;
    new.delivery_fee_source:=case when v_use_server_route then 'google_maps' else 'postgis' end;
  end if;

  new.delivery_distance_km:=round(v_distance::numeric,2)::double precision;
  new.delivery_fee:=v_fee;
  new.estimated_delivery_time:=now()+make_interval(mins=>greatest(10,coalesce(v_prep,15)+v_duration));
  new.delivery_address:=coalesce(v_delivery.formatted_address,concat_ws(', ',v_delivery.street_address,v_delivery.city,v_delivery.state_province));
  new.delivery_lat:=v_delivery.latitude::double precision;
  new.delivery_lng:=v_delivery.longitude::double precision;
  new.delivery_place_id:=v_delivery.place_id;
  new.metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object(
    'delivery_duration_minutes',v_duration,
    'delivery_pricing_source',new.route_source,
    'delivery_pricing_calculated_at',now(),
    'pickup_address_id',v_pickup.id,
    'delivery_location_status',case when v_delivery.latitude is null then 'text_only' else 'exact' end
  );
  return new;
end;
$$;

create or replace function public.create_manual_order_v1(p_actor_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.profiles%rowtype;
  v_business public.businesses%rowtype;
  v_branch public.business_addresses%rowtype;
  v_customer public.profiles%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_order public.orders%rowtype;
  v_existing record;
  v_item jsonb;
  v_modifier jsonb;
  v_allowed_modifier jsonb;
  v_resolved_items jsonb := '[]'::jsonb;
  v_resolved jsonb;
  v_delivery jsonb := coalesce(p_payload->'delivery_address','{}'::jsonb);
  v_notes jsonb := coalesce(p_payload->'notes','{}'::jsonb);
  v_business_id uuid;
  v_branch_id uuid;
  v_customer_id uuid;
  v_courier_id uuid;
  v_address_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_order_number text;
  v_actor_role text;
  v_customer_type text;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_delivery_type text;
  v_sales_channel text;
  v_sales_channel_detail text;
  v_payment_method public.payment_method;
  v_payment_status public.payment_status;
  v_initial_status public.order_status;
  v_quantity integer;
  v_unit_price numeric;
  v_modifier_total numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount numeric := greatest(coalesce((p_payload->>'discount_amount')::numeric,0),0);
  v_tax numeric := greatest(coalesce((p_payload->>'tax_amount')::numeric,0),0);
  v_delivery_fee numeric := greatest(coalesce((p_payload->>'delivery_fee')::numeric,0),0);
  v_amount_paid numeric := greatest(coalesce((p_payload->>'amount_paid')::numeric,0),0);
  v_distance double precision := greatest(coalesce((p_payload->>'distance_km')::double precision,0),0);
  v_duration integer := greatest(coalesce((p_payload->>'duration_minutes')::integer,0),0);
  v_fee_overridden boolean := coalesce((p_payload->>'delivery_fee_overridden')::boolean,false);
  v_fee_reason text := nullif(trim(p_payload->>'delivery_fee_override_reason'),'');
  v_fee_source text := coalesce(nullif(trim(p_payload->>'delivery_fee_source'),''),'automatic');
  v_admin_reason text := nullif(trim(p_payload->>'administrative_reason'),'');
  v_idempotency_key text := nullif(trim(p_payload->>'idempotency_key'),'');
  v_fingerprint text := nullif(trim(p_payload->>'request_fingerprint'),'');
  v_inventory_tracked boolean;
  v_custom_allowed boolean := false;
  v_registered_name text;
  v_metadata jsonb;
begin
  if p_actor_id is null then raise exception 'Actor requerido'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Solicitud inválida'; end if;
  if v_idempotency_key is null or length(v_idempotency_key)<16 or length(v_idempotency_key)>160 then
    raise exception 'Clave de idempotencia inválida';
  end if;
  if v_fingerprint is null or length(v_fingerprint)<32 then raise exception 'Huella de solicitud inválida'; end if;

  select * into v_actor from public.profiles
  where id=p_actor_id and status='active' and deleted_at is null;
  if v_actor.id is null then raise exception 'Usuario no autorizado'; end if;
  v_actor_role:=v_actor.role::text;
  if v_actor_role not in ('admin','merchant') then raise exception 'Rol no autorizado para crear pedidos manuales'; end if;

  select id, order_number, request_fingerprint into v_existing
  from public.orders
  where created_by_user_id=p_actor_id and idempotency_key=v_idempotency_key
    and created_manually=true and deleted_at is null
  limit 1;
  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception 'La clave de idempotencia ya fue usada con datos diferentes';
    end if;
    return jsonb_build_object('success',true,'replayed',true,'order_id',v_existing.id,'order_number',v_existing.order_number);
  end if;

  v_business_id:=(p_payload->>'business_id')::uuid;
  select * into v_business from public.businesses
  where id=v_business_id and is_active=true and deleted_at is null;
  if v_business.id is null then raise exception 'Negocio no encontrado o inactivo'; end if;
  if v_actor_role='merchant' and v_business.owner_id<>p_actor_id then
    raise exception 'No puedes crear pedidos para otro negocio';
  end if;

  v_branch_id:=nullif(p_payload->>'business_address_id','')::uuid;
  if v_branch_id is not null then
    select * into v_branch from public.business_addresses
    where id=v_branch_id and business_id=v_business.id and is_active=true and deleted_at is null;
  else
    select * into v_branch from public.business_addresses
    where business_id=v_business.id and is_active=true and deleted_at is null
    order by is_primary desc, created_at asc limit 1;
  end if;
  if v_branch.id is null then raise exception 'Selecciona una sucursal activa del negocio'; end if;

  if (not coalesce(v_business.is_accepting_orders,false) or coalesce(v_business.operations_status,'closed')<>'open')
     and v_actor_role='admin' and length(coalesce(v_admin_reason,''))<5 then
    raise exception 'El negocio está cerrado; indica el motivo administrativo para continuar';
  end if;

  v_customer_type:=coalesce(nullif(p_payload->>'customer_type',''),'guest');
  if v_customer_type not in ('guest','registered') then raise exception 'Tipo de cliente inválido'; end if;
  if v_customer_type='registered' then
    v_customer_id:=(p_payload->>'customer_id')::uuid;
    select * into v_customer from public.profiles
    where id=v_customer_id and role='customer' and status='active' and deleted_at is null;
    if v_customer.id is null then raise exception 'Cliente registrado no encontrado o inactivo'; end if;
    v_registered_name:=trim(concat_ws(' ',v_customer.first_name,v_customer.last_name));
    v_customer_name:=coalesce(nullif(v_registered_name,''),'Cliente DomiU');
    v_customer_phone:=v_customer.phone;
    v_customer_email:=v_customer.email;
  else
    v_customer_id:=null;
    v_customer_name:=trim(coalesce(p_payload->>'customer_name',''));
    v_customer_phone:=regexp_replace(coalesce(p_payload->>'customer_phone',''),'\D','','g');
    v_customer_email:=nullif(lower(trim(p_payload->>'customer_email')),'');
    if length(v_customer_name)<3 then raise exception 'Nombre del cliente invitado inválido'; end if;
    if v_customer_phone !~ '^3[0-9]{9}$' then raise exception 'Teléfono del cliente invitado inválido'; end if;
  end if;

  v_delivery_type:=coalesce(nullif(p_payload->>'delivery_type',''),'delivery');
  if v_delivery_type not in ('delivery','pickup') then raise exception 'Tipo de entrega inválido'; end if;
  if v_delivery_type='delivery' then
    if length(trim(coalesce(v_delivery->>'street_address','')))<5 then raise exception 'Dirección de entrega incompleta'; end if;
    insert into public.addresses(
      user_id,type,label,street_address,formatted_address,city,state_province,country,
      latitude,longitude,place_id,neighborhood,instructions,is_primary,metadata
    ) values (
      v_customer_id,'other','Pedido manual',trim(v_delivery->>'street_address'),nullif(trim(v_delivery->>'formatted_address'),''),
      coalesce(nullif(trim(v_delivery->>'city'),''),'Santa Marta'),'Magdalena','Colombia',
      nullif(v_delivery->>'latitude','')::numeric,nullif(v_delivery->>'longitude','')::numeric,
      nullif(trim(v_delivery->>'place_id'),''),nullif(trim(v_delivery->>'neighborhood'),''),
      nullif(trim(v_delivery->>'instructions'),''),false,
      jsonb_build_object('created_for_manual_order',true,'created_by',p_actor_id,'guest_address',v_customer_id is null)
    ) returning id into v_address_id;
  else
    v_address_id:=null;
    v_delivery_fee:=0;
    v_fee_overridden:=false;
    v_fee_source:='pickup';
  end if;

  v_sales_channel:=coalesce(nullif(p_payload->>'sales_channel',''),'other');
  if v_sales_channel not in ('whatsapp','phone','in_person','instagram','facebook','other') then
    raise exception 'Canal de origen inválido';
  end if;
  v_sales_channel_detail:=nullif(trim(p_payload->>'sales_channel_detail'),'');
  if v_sales_channel='other' and length(coalesce(v_sales_channel_detail,''))<3 then
    raise exception 'Describe el canal de origen';
  end if;

  begin
    v_payment_method:=(coalesce(nullif(p_payload->>'payment_method',''),'cash'))::public.payment_method;
  exception when invalid_text_representation then
    raise exception 'Método de pago inválido';
  end;
  begin
    v_payment_status:=(coalesce(nullif(p_payload->>'payment_status',''),'pending'))::public.payment_status;
  exception when invalid_text_representation then
    raise exception 'Estado de pago inválido';
  end;

  if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')=0 then
    raise exception 'Agrega al menos un producto';
  end if;

  v_custom_allowed:=v_actor_role='admin' or lower(coalesce(v_business.metadata->>'allow_custom_manual_items','false')) in ('true','1','yes');

  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    v_quantity:=coalesce((v_item->>'quantity')::integer,0);
    if v_quantity<1 or v_quantity>100 then raise exception 'Cantidad de producto inválida'; end if;
    v_modifier_total:=0;

    if coalesce((v_item->>'is_custom_item')::boolean,false) then
      if not v_custom_allowed then raise exception 'El negocio no permite productos personalizados'; end if;
      if v_actor_role='admin' and length(coalesce(v_admin_reason,''))<5 then
        raise exception 'Los productos personalizados requieren motivo administrativo';
      end if;
      v_unit_price:=coalesce((v_item->>'unit_price')::numeric,0);
      if v_unit_price<=0 or trunc(v_unit_price)<>v_unit_price then raise exception 'Precio del producto personalizado inválido'; end if;
      if length(trim(coalesce(v_item->>'name','')))<2 then raise exception 'Nombre del producto personalizado inválido'; end if;
      v_line_total:=v_unit_price*v_quantity;
      v_subtotal:=v_subtotal+v_line_total;
      v_resolved_items:=v_resolved_items||jsonb_build_array(jsonb_build_object(
        'product_id',null,'variant_id',null,'quantity',v_quantity,'unit_price',v_unit_price,
        'item_total',v_line_total,'name',trim(v_item->>'name'),'sku',null,'is_custom_item',true,
        'description',nullif(trim(v_item->>'description'),''),'special_instructions',nullif(trim(v_item->>'special_instructions'),''),
        'variant_snapshot','{}'::jsonb,'modifiers_snapshot',coalesce(v_item->'modifiers','[]'::jsonb)
      ));
    else
      v_product_id:=(v_item->>'product_id')::uuid;
      select * into v_product from public.products
      where id=v_product_id and business_id=v_business.id and status='available' and deleted_at is null
      for update;
      if v_product.id is null then raise exception 'Producto no disponible o perteneciente a otro negocio'; end if;
      v_unit_price:=coalesce(nullif(v_product.discount_price,0),v_product.price);

      v_variant_id:=nullif(v_item->>'variant_id','')::uuid;
      if v_variant_id is not null then
        select * into v_variant from public.product_variants
        where id=v_variant_id and product_id=v_product.id and is_active=true
        for update;
        if v_variant.id is null then raise exception 'Variante inválida'; end if;
        v_unit_price:=v_unit_price+coalesce(v_variant.price_modifier,0);
      else
        v_variant:=null;
      end if;

      if jsonb_typeof(coalesce(v_item->'modifiers','[]'::jsonb))='array' then
        for v_modifier in select value from jsonb_array_elements(coalesce(v_item->'modifiers','[]'::jsonb)) loop
          v_allowed_modifier:=null;
          select value into v_allowed_modifier
          from jsonb_array_elements(coalesce(v_product.metadata->'extras','[]'::jsonb))
          where lower(value->>'name')=lower(v_modifier->>'name') limit 1;
          if v_allowed_modifier is null then raise exception 'Complemento no autorizado para el producto'; end if;
          v_modifier_total:=v_modifier_total+greatest(coalesce((v_allowed_modifier->>'price')::numeric,0),0);
        end loop;
      end if;
      v_unit_price:=v_unit_price+v_modifier_total;
      v_line_total:=v_unit_price*v_quantity;
      v_subtotal:=v_subtotal+v_line_total;
      v_resolved_items:=v_resolved_items||jsonb_build_array(jsonb_build_object(
        'product_id',v_product.id,'variant_id',v_variant_id,'quantity',v_quantity,'unit_price',v_unit_price,
        'item_total',v_line_total,'name',v_product.name,'sku',v_product.sku,'is_custom_item',false,
        'description',null,'special_instructions',nullif(trim(v_item->>'special_instructions'),''),
        'variant_snapshot',case when v_variant_id is null then '{}'::jsonb else jsonb_build_object('id',v_variant.id,'name',v_variant.name,'values',v_variant.values,'price_modifier',v_variant.price_modifier) end,
        'modifiers_snapshot',coalesce(v_item->'modifiers','[]'::jsonb),
        'inventory_tracked',lower(coalesce(v_product.metadata->>'track_inventory','false')) in ('true','1','yes')
      ));
    end if;
  end loop;

  if v_subtotal<=0 then raise exception 'El subtotal debe ser mayor a cero'; end if;
  if v_discount>v_subtotal then raise exception 'El descuento no puede superar el subtotal'; end if;
  if v_actor_role='merchant' then
    if v_discount>0 and (
      coalesce((v_business.metadata->>'manual_order_max_discount_pct')::numeric,0)<=0
      or (v_discount/v_subtotal*100)>coalesce((v_business.metadata->>'manual_order_max_discount_pct')::numeric,0)
    ) then raise exception 'El descuento supera la autorización del negocio'; end if;
    if v_fee_overridden and lower(coalesce(v_business.metadata->>'allow_manual_delivery_fee_override','false')) not in ('true','1','yes') then
      raise exception 'No tienes permiso para modificar manualmente la tarifa';
    end if;
  end if;
  if v_fee_overridden and length(coalesce(v_fee_reason,''))<5 then raise exception 'Indica el motivo de la tarifa manual'; end if;

  v_courier_id:=nullif(p_payload->>'courier_id','')::uuid;
  if v_courier_id is not null then
    if v_actor_role<>'admin' then raise exception 'Solo administración puede asignar un repartidor al crear el pedido'; end if;
    if not exists(select 1 from public.profiles where id=v_courier_id and role='courier' and status='active' and deleted_at is null) then
      raise exception 'Repartidor no disponible';
    end if;
    v_initial_status:='assigned';
  else
    begin
      v_initial_status:=(coalesce(nullif(p_payload->>'initial_status',''),'confirmed'))::public.order_status;
    exception when invalid_text_representation then
      raise exception 'Estado inicial inválido';
    end;
    if v_initial_status not in ('pending','confirmed') then raise exception 'Estado inicial no permitido'; end if;
  end if;

  if v_payment_status='completed' and v_amount_paid<=0 then
    v_amount_paid:=v_subtotal-v_discount+v_tax+v_delivery_fee;
  end if;

  v_order_number:=public.generate_order_number();
  v_metadata:=jsonb_build_object(
    'source',case when v_actor_role='admin' then 'admin_manual' else 'business_manual' end,
    'created_manually',true,
    'has_products',true,
    'assignment_mode',case when v_courier_id is null then 'public' else 'manual' end,
    'distance_km',v_distance,
    'duration_minutes',v_duration,
    'customer_phone',v_customer_phone,
    'business_name',v_business.name,
    'business_address',v_branch.street_address,
    'idempotency_key',v_idempotency_key
  );

  insert into public.orders(
    order_number,order_code,order_type,customer_id,business_id,courier_id,delivery_address_id,pickup_address_id,
    status,payment_status,payment_method,subtotal,delivery_fee,discount_amount,tax_amount,total_amount,
    special_instructions,metadata,pickup_address,pickup_lat,pickup_lng,customer_phone,
    route_distance_km,route_duration_minutes,route_source,
    created_manually,creation_source,created_by_user_id,created_by_role,created_from_panel,business_address_id,
    guest_customer_name,guest_customer_phone,guest_customer_email,customer_snapshot,delivery_address_snapshot,business_snapshot,
    sales_channel,sales_channel_detail,delivery_type,delivery_fee_source,delivery_fee_overridden,delivery_fee_override_reason,
    kitchen_notes,courier_notes,internal_notes,payment_notes,amount_paid,currency,idempotency_key,request_fingerprint,
    administrative_reason,confirmed_at
  ) values (
    v_order_number,v_order_number,'manual_order',v_customer_id,v_business.id,v_courier_id,v_address_id,v_branch.id,
    v_initial_status,v_payment_status,v_payment_method,v_subtotal,v_delivery_fee,v_discount,v_tax,
    v_subtotal-v_discount+v_tax+v_delivery_fee,
    nullif(trim(v_notes->>'customer'),''),v_metadata,v_branch.street_address,v_branch.latitude::double precision,v_branch.longitude::double precision,v_customer_phone,
    nullif(v_distance,0),nullif(v_duration,0),case when v_delivery_type='pickup' then 'pickup' else coalesce(nullif(p_payload->>'route_source',''),'postgis_direct') end,
    true,case when v_actor_role='admin' then 'admin_manual' else 'business_manual' end,p_actor_id,v_actor_role,
    case when v_actor_role='admin' then 'admin' else 'business' end,v_branch.id,
    case when v_customer_id is null then v_customer_name else null end,case when v_customer_id is null then v_customer_phone else null end,
    case when v_customer_id is null then v_customer_email else null end,
    jsonb_build_object('id',v_customer_id,'type',v_customer_type,'name',v_customer_name,'phone',v_customer_phone,'email',v_customer_email),
    case when v_delivery_type='pickup' then jsonb_build_object('type','pickup','business_address_id',v_branch.id) else v_delivery||jsonb_build_object('type','delivery') end,
    jsonb_build_object('id',v_business.id,'name',v_business.name,'address_id',v_branch.id,'address',v_branch.street_address,'city',v_branch.city),
    v_sales_channel,v_sales_channel_detail,v_delivery_type,v_fee_source,v_fee_overridden,v_fee_reason,
    nullif(trim(v_notes->>'kitchen'),''),nullif(trim(v_notes->>'courier'),''),nullif(trim(v_notes->>'internal'),''),
    nullif(trim(p_payload->>'payment_notes'),''),v_amount_paid,'COP',v_idempotency_key,v_fingerprint,v_admin_reason,
    case when v_initial_status in ('confirmed','assigned') then now() else null end
  ) returning * into v_order;

  for v_resolved in select value from jsonb_array_elements(v_resolved_items) loop
    insert into public.order_items(
      order_id,product_id,quantity,unit_price,item_total,variant_selections,special_instructions,
      product_name_snapshot,product_sku_snapshot,variant_snapshot,modifiers_snapshot,is_custom_item,custom_description,metadata
    ) values (
      v_order.id,nullif(v_resolved->>'product_id','')::uuid,(v_resolved->>'quantity')::integer,
      (v_resolved->>'unit_price')::numeric,(v_resolved->>'item_total')::numeric,
      coalesce(v_resolved->'variant_snapshot','{}'::jsonb),nullif(v_resolved->>'special_instructions',''),
      v_resolved->>'name',nullif(v_resolved->>'sku',''),coalesce(v_resolved->'variant_snapshot','{}'::jsonb),
      coalesce(v_resolved->'modifiers_snapshot','[]'::jsonb),coalesce((v_resolved->>'is_custom_item')::boolean,false),
      nullif(v_resolved->>'description',''),jsonb_build_object('manual_order',true)
    );

    if not coalesce((v_resolved->>'is_custom_item')::boolean,false)
       and coalesce((v_resolved->>'inventory_tracked')::boolean,false) then
      v_product_id:=(v_resolved->>'product_id')::uuid;
      v_variant_id:=nullif(v_resolved->>'variant_id','')::uuid;
      v_quantity:=(v_resolved->>'quantity')::integer;
      if v_variant_id is not null then
        update public.product_variants set quantity_available=quantity_available-v_quantity
        where id=v_variant_id and product_id=v_product_id and quantity_available>=v_quantity;
        if not found then raise exception 'Stock insuficiente para una variante'; end if;
      else
        update public.products set quantity_available=quantity_available-v_quantity
        where id=v_product_id and quantity_available>=v_quantity;
        if not found then raise exception 'Stock insuficiente para un producto'; end if;
      end if;
      insert into public.inventory_movements(product_id,variant_id,order_id,actor_id,quantity_delta,reason,metadata)
      values(v_product_id,v_variant_id,v_order.id,p_actor_id,-v_quantity,'manual_order_confirmed',jsonb_build_object('order_number',v_order.order_number));
    end if;
  end loop;

  insert into public.order_tracking(order_id,status,notes)
  values(v_order.id,v_order.status,'Pedido manual creado desde el panel '||case when v_actor_role='admin' then 'administrativo' else 'del negocio' end);

  insert into public.audit_log(user_id,user_email,user_role,action,entity_type,entity_id,details,result,metadata)
  values(
    p_actor_id,v_actor.email,v_actor_role,'manual_order_created','orders',v_order.id::text,
    jsonb_build_object('business_id',v_business.id,'business_address_id',v_branch.id,'sales_channel',v_sales_channel,
      'delivery_type',v_delivery_type,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,
      'total_amount',v_order.total_amount,'idempotency_key',v_idempotency_key,'fee_overridden',v_fee_overridden),
    'success',jsonb_build_object('request_fingerprint',v_fingerprint)
  );

  return jsonb_build_object(
    'success',true,'replayed',false,'order_id',v_order.id,'order_number',v_order.order_number,
    'status',v_order.status,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,
    'service_fee',v_order.service_fee,'total_amount',v_order.total_amount,'amount_due',v_order.amount_due
  );
exception
  when unique_violation then
    select id,order_number,request_fingerprint into v_existing
    from public.orders
    where created_by_user_id=p_actor_id and idempotency_key=v_idempotency_key
      and created_manually=true and deleted_at is null limit 1;
    if found and v_existing.request_fingerprint=v_fingerprint then
      return jsonb_build_object('success',true,'replayed',true,'order_id',v_existing.id,'order_number',v_existing.order_number);
    end if;
    raise;
end;
$$;

revoke all on function public.create_manual_order_v1(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.create_manual_order_v1(uuid,jsonb) to service_role;

comment on function public.create_manual_order_v1(uuid,jsonb) is
  'Crea pedidos manuales de forma atómica, recalcula precios desde catálogo, valida propiedad, inventario e idempotencia.';
comment on table public.manual_order_drafts is
  'Borradores reversibles de pedidos manuales; no descuentan inventario ni generan ventas.';

commit;
