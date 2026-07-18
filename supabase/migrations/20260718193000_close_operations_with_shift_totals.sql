-- Cierre general seguro de la operación DomiU.
-- Evita cerrar con pedidos activos y consolida cada jornada antes de archivarla.

create or replace function public.close_platform_operation(p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_operation_id uuid;
  v_closed_at timestamptz := now();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo un administrador puede cerrar operaciones';
  end if;

  if exists (
    select 1
    from public.orders o
    where o.deleted_at is null
      and o.status in ('pending','confirmed','preparing','ready','assigned','accepted','picked_up','in_transit')
  ) then
    raise exception 'No se pueden cerrar operaciones mientras existan pedidos activos';
  end if;

  select id
  into v_operation_id
  from public.operations_days
  where status = 'open'
  order by opened_at desc
  limit 1
  for update;

  if v_operation_id is null then
    raise exception 'No existe una jornada operativa abierta';
  end if;

  update public.business_shifts bs
  set status = 'closed',
      closed_at = v_closed_at,
      closed_by = auth.uid(),
      delivered_orders = (
        select count(*)
        from public.orders o
        where o.business_id = bs.business_id
          and o.status = 'delivered'
          and coalesce(o.actual_delivery_time, o.updated_at) >= bs.opened_at
          and coalesce(o.actual_delivery_time, o.updated_at) <= v_closed_at
      ),
      product_sales = (
        select coalesce(sum(o.merchant_earnings), 0)
        from public.orders o
        where o.business_id = bs.business_id
          and o.status = 'delivered'
          and coalesce(o.actual_delivery_time, o.updated_at) >= bs.opened_at
          and coalesce(o.actual_delivery_time, o.updated_at) <= v_closed_at
      ),
      notes = coalesce(bs.notes, 'Cierre desde la operación general de DomiU.'),
      updated_at = v_closed_at
  where bs.status = 'open';

  update public.courier_shifts cs
  set status = 'closed',
      ended_at = v_closed_at,
      online_minutes = greatest(0, floor(extract(epoch from (v_closed_at - cs.started_at)) / 60)::integer),
      delivered_orders = (
        select count(*)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      gross_delivery_value = (
        select coalesce(sum(l.courier_gross_earnings), 0)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      platform_commission = (
        select coalesce(sum(l.courier_commission), 0)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      net_earnings = (
        select coalesce(sum(l.courier_net_earnings), 0)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      cash_collected = (
        select coalesce(sum(l.customer_total), 0)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.collector_type = 'courier'
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      company_owes_courier = (
        select coalesce(sum(case when l.collector_type <> 'courier' then l.courier_net_earnings else 0 end), 0)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      courier_owes_company = (
        select coalesce(sum(case when l.collector_type = 'courier' then l.customer_total - l.courier_net_earnings else 0 end), 0)
        from public.order_financial_ledger l
        where l.courier_id = cs.courier_id
          and l.finalized_at >= cs.started_at
          and l.finalized_at <= v_closed_at
      ),
      notes = coalesce(cs.notes, 'Cierre desde la operación general de DomiU.'),
      updated_at = v_closed_at
  where cs.status = 'open';

  update public.businesses
  set is_accepting_orders = false,
      operations_status = 'closed',
      closed_at = v_closed_at,
      updated_at = v_closed_at
  where is_accepting_orders = true or operations_status = 'open';

  update public.drivers
  set status = 'offline',
      is_active = false,
      is_available = false,
      updated_at = v_closed_at
  where deleted_at is null
    and status in ('available','on_break');

  update public.operations_days
  set status = 'closed',
      closed_at = v_closed_at,
      closed_by = auth.uid(),
      closing_notes = nullif(trim(p_notes), ''),
      updated_at = v_closed_at
  where id = v_operation_id;

  return v_operation_id;
end;
$$;

revoke all on function public.close_platform_operation(text) from public, anon;
grant execute on function public.close_platform_operation(text) to authenticated, service_role;
