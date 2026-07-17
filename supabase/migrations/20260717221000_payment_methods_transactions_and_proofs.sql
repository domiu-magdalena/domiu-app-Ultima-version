-- DomiU: métodos por negocio, transacciones sincronizadas y comprobantes privados.

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric not null,
  provider text,
  provider_reference text,
  proof_url text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_amount_check check (amount >= 0)
);

create index if not exists payment_transactions_customer_idx
  on public.payment_transactions(customer_id, created_at desc);
create index if not exists payment_transactions_status_idx
  on public.payment_transactions(status, method);

alter table public.payment_transactions enable row level security;

create or replace function public.can_manage_order_payment(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.is_business_owner(o.business_id)
  );
$$;

revoke all on function public.can_manage_order_payment(uuid) from public, anon;
grant execute on function public.can_manage_order_payment(uuid)
  to authenticated, service_role;

drop policy if exists "Payment actors read transactions"
  on public.payment_transactions;
create policy "Payment actors read transactions"
on public.payment_transactions
for select to authenticated
using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Business reads order payments"
  on public.payment_transactions;
create policy "Business reads order payments"
on public.payment_transactions
for select to authenticated
using (public.can_manage_order_payment(order_id));

drop policy if exists "Business verifies order transfers"
  on public.payment_transactions;
create policy "Business verifies order transfers"
on public.payment_transactions
for update to authenticated
using (public.can_manage_order_payment(order_id))
with check (public.can_manage_order_payment(order_id));

create table if not exists public.business_payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  method public.payment_method not null,
  display_name text not null,
  is_enabled boolean not null default false,
  provider text,
  account_holder text,
  account_identifier text,
  instructions text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id, method)
);

create index if not exists business_payment_methods_enabled_idx
  on public.business_payment_methods(business_id, is_enabled);

alter table public.business_payment_methods enable row level security;

insert into public.business_payment_methods(
  business_id,
  method,
  display_name,
  is_enabled,
  instructions
)
select
  b.id,
  'cash'::public.payment_method,
  'Efectivo contra entrega',
  true,
  'El cliente paga al repartidor cuando recibe el pedido.'
from public.businesses b
where b.deleted_at is null
on conflict (business_id, method) do nothing;

drop policy if exists "Customers read enabled business payments"
  on public.business_payment_methods;
create policy "Customers read enabled business payments"
on public.business_payment_methods
for select to authenticated
using (
  is_enabled = true
  or public.is_business_owner(business_id)
  or public.is_admin()
);

drop policy if exists "Business owners manage payment methods"
  on public.business_payment_methods;
create policy "Business owners manage payment methods"
on public.business_payment_methods
for all to authenticated
using (public.is_business_owner(business_id) or public.is_admin())
with check (public.is_business_owner(business_id) or public.is_admin());

insert into storage.buckets(
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers upload own payment proofs"
  on storage.objects;
create policy "Customers upload own payment proofs"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Payment actors read proofs"
  on storage.objects;
create policy "Payment actors read proofs"
on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.payment_transactions pt
      where pt.proof_url = storage.objects.name
        and public.can_manage_order_payment(pt.order_id)
    )
  )
);

drop policy if exists "Customers replace own payment proofs"
  on storage.objects;
create policy "Customers replace own payment proofs"
on storage.objects
for update to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Customers delete own payment proofs"
  on storage.objects;
create policy "Customers delete own payment proofs"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.finalize_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.payment_method is null then
    new.payment_method := 'cash'::public.payment_method;
  end if;

  if new.payment_method = 'transfer'::public.payment_method
     and coalesce(
       new.payment_status,
       'pending'::public.payment_status
     ) = 'pending'::public.payment_status then
    new.payment_status := 'pending_verification'::public.payment_status;
    new.metadata := coalesce(new.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'payment_verification_required', true,
        'payment_state_source', 'customer_checkout'
      );
  end if;

  if new.status = 'delivered'::public.order_status
     and new.payment_method = 'cash'::public.payment_method
     and coalesce(
       new.payment_status,
       'pending'::public.payment_status
     ) = 'pending'::public.payment_status then
    new.payment_status := 'completed'::public.payment_status;
    new.metadata := coalesce(new.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'payment_completed_at', now(),
        'payment_completion_source', 'cash_on_delivery'
      );
  end if;

  return new;
end;
$$;

revoke all on function public.finalize_order_payment()
  from public, anon, authenticated;
grant execute on function public.finalize_order_payment()
  to service_role;

create or replace function public.sync_order_payment_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.payment_transactions(
    order_id,
    customer_id,
    method,
    status,
    amount,
    provider_reference,
    proof_url,
    metadata,
    updated_at
  )
  values (
    new.id,
    new.customer_id,
    new.payment_method,
    new.payment_status,
    new.total_amount,
    new.payment_reference,
    new.payment_proof_url,
    jsonb_build_object('order_status', new.status),
    now()
  )
  on conflict (order_id) do update set
    method = excluded.method,
    status = excluded.status,
    amount = excluded.amount,
    provider_reference = excluded.provider_reference,
    proof_url = excluded.proof_url,
    metadata = public.payment_transactions.metadata || excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_order_payment_transaction()
  from public, anon, authenticated;
grant execute on function public.sync_order_payment_transaction()
  to service_role;

drop trigger if exists sync_order_payment_transaction_trigger
  on public.orders;
create trigger sync_order_payment_transaction_trigger
after insert or update of
  payment_method,
  payment_status,
  total_amount,
  status
on public.orders
for each row execute function public.sync_order_payment_transaction();

insert into public.payment_transactions(
  order_id,
  customer_id,
  method,
  status,
  amount,
  provider_reference,
  proof_url,
  metadata
)
select
  o.id,
  o.customer_id,
  o.payment_method,
  o.payment_status,
  o.total_amount,
  o.payment_reference,
  o.payment_proof_url,
  jsonb_build_object(
    'backfilled', true,
    'order_status', o.status
  )
from public.orders o
where o.deleted_at is null
on conflict (order_id) do update set
  method = excluded.method,
  status = excluded.status,
  amount = excluded.amount,
  provider_reference = excluded.provider_reference,
  proof_url = excluded.proof_url,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payment_transactions'
  ) then
    alter publication supabase_realtime
      add table public.payment_transactions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'business_payment_methods'
  ) then
    alter publication supabase_realtime
      add table public.business_payment_methods;
  end if;
end;
$$;
