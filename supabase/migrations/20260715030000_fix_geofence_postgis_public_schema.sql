-- Corrige el esquema real de PostGIS usado por el trigger de geocercas.
-- En este proyecto las funciones ST_* están instaladas en public, no en extensions.

create or replace function public.detect_geofence_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_status public.order_status;
  v_business_lat double precision;
  v_business_lng double precision;
  v_customer_lat double precision;
  v_customer_lng double precision;
  v_dist_to_business_m double precision := 999999;
  v_dist_to_customer_m double precision := 999999;
begin
  if new.order_id is null or new.latitude is null or new.longitude is null then
    return new;
  end if;

  select
    o.status,
    ba.latitude::double precision,
    ba.longitude::double precision,
    a.latitude::double precision,
    a.longitude::double precision
  into
    v_order_status,
    v_business_lat,
    v_business_lng,
    v_customer_lat,
    v_customer_lng
  from public.orders o
  left join public.business_addresses ba
    on ba.business_id = o.business_id
   and ba.is_primary = true
   and ba.deleted_at is null
  left join public.addresses a
    on a.id = o.delivery_address_id
   and a.deleted_at is null
  where o.id = new.order_id
  limit 1;

  if v_business_lat is not null and v_business_lng is not null then
    v_dist_to_business_m := public.st_distancesphere(
      public.st_setsrid(
        public.st_makepoint(new.longitude::double precision, new.latitude::double precision),
        4326
      ),
      public.st_setsrid(public.st_makepoint(v_business_lng, v_business_lat), 4326)
    );
  end if;

  if v_customer_lat is not null and v_customer_lng is not null then
    v_dist_to_customer_m := public.st_distancesphere(
      public.st_setsrid(
        public.st_makepoint(new.longitude::double precision, new.latitude::double precision),
        4326
      ),
      public.st_setsrid(public.st_makepoint(v_customer_lng, v_customer_lat), 4326)
    );
  end if;

  if v_dist_to_business_m <= 150
     and v_order_status in ('confirmed', 'preparing', 'ready', 'assigned', 'accepted') then
    insert into public.geofence_events (
      order_id,
      driver_id,
      event_type,
      latitude,
      longitude,
      accuracy
    )
    values (
      new.order_id,
      new.driver_id,
      'arrived_at_business',
      new.latitude,
      new.longitude,
      new.accuracy
    )
    on conflict do nothing;
  end if;

  if v_dist_to_customer_m <= 150 and v_order_status in ('picked_up', 'in_transit') then
    insert into public.geofence_events (
      order_id,
      driver_id,
      event_type,
      latitude,
      longitude,
      accuracy
    )
    values (
      new.order_id,
      new.driver_id,
      'arrived_at_customer',
      new.latitude,
      new.longitude,
      new.accuracy
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

alter function public.detect_geofence_event() owner to postgres;
revoke all on function public.detect_geofence_event() from public, anon, authenticated;
grant execute on function public.detect_geofence_event() to service_role;
