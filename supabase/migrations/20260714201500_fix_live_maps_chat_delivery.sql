-- Permite un chat independiente por pedido y evita mezclar conversaciones antiguas.
alter table public.chats
  drop constraint if exists chats_participant_1_id_participant_2_id_key;

-- El cliente, el repartidor asignado, el negocio y el administrador pueden
-- consultar la dirección usada por un pedido operativo.
drop policy if exists "Order actors read delivery addresses" on public.addresses;
create policy "Order actors read delivery addresses"
on public.addresses
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.orders o
    left join public.businesses b on b.id = o.business_id
    where o.delivery_address_id = addresses.id
      and o.deleted_at is null
      and (
        o.customer_id = auth.uid()
        or o.courier_id = auth.uid()
        or b.owner_id = auth.uid()
        or public.is_admin()
      )
  )
);

-- Cierra conversaciones de pedidos terminados.
update public.chats c
set is_active = false,
    updated_at = now()
from public.orders o
where o.id = c.order_id
  and o.status in ('delivered', 'cancelled')
  and c.is_active = true;

-- Repara pedidos activos que todavía no tenían su chat propio.
insert into public.chats (
  participant_1_id,
  participant_2_id,
  order_id,
  is_active,
  metadata
)
select
  least(o.customer_id, o.courier_id),
  greatest(o.customer_id, o.courier_id),
  o.id,
  true,
  jsonb_build_object('scope', 'delivery_order', 'created_by', 'system_repair')
from public.orders o
where o.customer_id is not null
  and o.courier_id is not null
  and o.status in ('assigned', 'accepted', 'picked_up', 'in_transit')
  and o.deleted_at is null
  and not exists (
    select 1
    from public.chats c
    where c.order_id = o.id
      and c.is_active = true
      and c.deleted_at is null
  );

create unique index if not exists ux_chats_active_order
on public.chats(order_id)
where order_id is not null and is_active = true and deleted_at is null;

create or replace function public.sync_delivery_order_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null
     and new.courier_id is not null
     and new.status in ('assigned', 'accepted', 'picked_up', 'in_transit') then
    if not exists (
      select 1
      from public.chats c
      where c.order_id = new.id
        and c.is_active = true
        and c.deleted_at is null
    ) then
      insert into public.chats(
        participant_1_id,
        participant_2_id,
        order_id,
        is_active,
        metadata
      )
      values (
        least(new.customer_id, new.courier_id),
        greatest(new.customer_id, new.courier_id),
        new.id,
        true,
        jsonb_build_object('scope', 'delivery_order')
      );
    end if;
  elsif new.status in ('delivered', 'cancelled') then
    update public.chats
    set is_active = false,
        updated_at = now()
    where order_id = new.id
      and is_active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_delivery_order_chat on public.orders;
create trigger trg_sync_delivery_order_chat
after insert or update of courier_id, status
on public.orders
for each row
execute function public.sync_delivery_order_chat();

-- Necesario para que el upsert del GPS del repartidor pueda actualizar una sola
-- fila por repartidor y pedido en lugar de fallar silenciosamente.
create unique index if not exists ux_driver_locations_driver_order
on public.driver_locations(driver_id, order_id);
