create or replace function public.delivery_quote_values(p_business_id uuid, p_address_id uuid)
returns table(distance_km double precision, duration_minutes integer, delivery_fee numeric)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_delivery_lat double precision;
  v_delivery_lng double precision;
  v_distance double precision;
  v_extra_distance double precision;
  v_raw numeric;
begin
  select ba.latitude::double precision, ba.longitude::double precision
    into v_pickup_lat, v_pickup_lng
  from public.business_addresses ba
  where ba.business_id = p_business_id
    and ba.is_primary = true
    and ba.deleted_at is null
  order by ba.updated_at desc nulls last
  limit 1;

  if v_pickup_lat is null or v_pickup_lng is null then
    select b.latitude::double precision, b.longitude::double precision
      into v_pickup_lat, v_pickup_lng
    from public.businesses b
    where b.id = p_business_id;
  end if;

  select a.latitude::double precision, a.longitude::double precision
    into v_delivery_lat, v_delivery_lng
  from public.addresses a
  where a.id = p_address_id and a.deleted_at is null;

  if v_pickup_lat is null or v_pickup_lng is null then
    raise exception 'El negocio debe guardar su ubicación exacta antes de recibir pedidos';
  end if;

  if v_delivery_lat is null or v_delivery_lng is null then
    distance_km := 0::double precision;
    duration_minutes := 15;
    delivery_fee := 5000::numeric;
    return next;
    return;
  end if;

  v_distance := st_distancesphere(
    st_setsrid(st_makepoint(v_pickup_lng, v_pickup_lat), 4326),
    st_setsrid(st_makepoint(v_delivery_lng, v_delivery_lat), 4326)
  ) / 1000.0;

  v_extra_distance := greatest(v_distance - 2.0, 0.0);
  v_raw := 5000 + (v_extra_distance * 1200);

  distance_km := round(v_distance::numeric, 2)::double precision;
  duration_minutes := greatest(5, ceil((v_distance / 25.0) * 60.0)::integer);
  delivery_fee := case
    when v_distance <= 2.0 then 5000::numeric
    else ceil(v_raw / 500.0) * 500.0
  end;
  return next;
end;
$function$;

create or replace function public.set_order_delivery_pricing()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_quote record;
  v_pickup record;
  v_prep integer := 15;
  v_has_delivery_coordinates boolean := false;
begin
  select * into v_quote
  from public.delivery_quote_values(new.business_id, new.delivery_address_id);

  select ba.street_address, ba.latitude::double precision as latitude, ba.longitude::double precision as longitude
    into v_pickup
  from public.business_addresses ba
  where ba.business_id = new.business_id
    and ba.is_primary = true
    and ba.deleted_at is null
  order by ba.updated_at desc nulls last
  limit 1;

  select (a.latitude is not null and a.longitude is not null)
    into v_has_delivery_coordinates
  from public.addresses a
  where a.id = new.delivery_address_id
    and a.deleted_at is null;

  select coalesce((b.metadata->>'avgPrepTimeMinutes')::integer, (b.metadata->>'avg_prep_time_minutes')::integer, 15)
    into v_prep
  from public.businesses b where b.id = new.business_id;

  new.delivery_distance_km := v_quote.distance_km;
  new.delivery_fee := v_quote.delivery_fee;
  new.total_amount := coalesce(new.subtotal, 0) + v_quote.delivery_fee + coalesce(new.tax_amount, 0) - coalesce(new.discount_amount, 0);
  new.estimated_delivery_time := now() + make_interval(mins => greatest(10, coalesce(v_prep, 15) + v_quote.duration_minutes));
  new.pickup_address := coalesce(new.pickup_address, v_pickup.street_address);
  new.pickup_lat := coalesce(new.pickup_lat, v_pickup.latitude);
  new.pickup_lng := coalesce(new.pickup_lng, v_pickup.longitude);
  new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
    'delivery_duration_minutes', v_quote.duration_minutes,
    'delivery_pricing_source', case when v_has_delivery_coordinates then 'coordinates' else 'minimum_fee_without_coordinates' end,
    'delivery_pricing_calculated_at', now()
  );
  return new;
end;
$function$;
