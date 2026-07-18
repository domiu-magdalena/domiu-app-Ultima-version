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
    raise exception 'Selecciona o comparte una dirección con ubicación exacta';
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

comment on function public.delivery_quote_values(uuid, uuid) is
'Tarifa DomiU: COP 5.000 cubre hasta 2 km; desde 2 km suma COP 1.200 por km adicional y redondea al siguiente múltiplo de COP 500.';
