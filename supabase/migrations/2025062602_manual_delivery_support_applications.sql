-- Migration: 2025062602 - Manual delivery, support tickets, and applications
-- Adds order_type, courier_applications, business_applications, support_tickets

-- ============================================================
-- 1. ORDER TYPE AND DELIVERY CODE
-- ============================================================

-- add order_type column with default for existing orders
alter table public.orders
add column if not exists order_type text default 'product_order';

-- add earnings columns for manual deliveries
alter table public.orders
add column if not exists courier_earnings decimal(10, 2) default 0;
alter table public.orders
add column if not exists platform_earnings decimal(10, 2) default 0;

-- add origin fields for manual deliveries (delivery pickup location)
alter table public.orders
add column if not exists pickup_address text;
alter table public.orders
add column if not exists pickup_lat double precision;
alter table public.orders
add column if not exists pickup_lng double precision;
alter table public.orders
add column if not exists customer_phone text;
alter table public.orders
add column if not exists delivery_distance_km double precision default 0;

-- create index for order_type filtering
create index if not exists idx_orders_order_type on public.orders(order_type);

-- ============================================================
-- 2. DELIVERY CODE GENERATION (DOMI-YYYYMMDD-HHMMSS-XXXX)
-- ============================================================

create or replace function generate_delivery_code()
returns text as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := 'DOMI-' || to_char(current_timestamp, 'YYYYMMDD-HH24MISS-') ||
              lpad(floor(random() * 10000)::text, 4, '0');
    select exists(select 1 from orders where order_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$ language plpgsql;

-- ============================================================
-- 3. SUPPORT TICKETS TABLE
-- ============================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  order_id uuid references public.orders(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  courier_id uuid references public.profiles(id) on delete set null,
  ticket_type text not null,
  priority text not null default 'normal',
  subject text,
  description text not null,
  status text not null default 'open',
  attachments jsonb default '[]'::jsonb,
  admin_response text,
  internal_notes text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp
);

create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_role on public.support_tickets(role);
create index if not exists idx_support_tickets_created on public.support_tickets(created_at desc);

-- ============================================================
-- 4. COURIER APPLICATIONS TABLE
-- ============================================================

create table if not exists public.courier_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  status text not null default 'pending',
  -- personal data
  full_name text not null,
  document_id text not null,
  birth_date date,
  phone text not null,
  whatsapp text,
  city text,
  neighborhood text,
  address text,
  -- vehicle
  vehicle_type text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  -- documents (storage paths)
  document_photo_url text,
  license_url text,
  soat_url text,
  techno_review_url text,
  vehicle_photo_url text,
  profile_photo_url text,
  -- payment
  payment_method text,
  payment_account_number text,
  -- emergency
  emergency_contact text,
  emergency_phone text,
  -- terms acceptance
  accepted_terms boolean default false,
  accepted_privacy boolean default false,
  -- admin review
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp
);

create index if not exists idx_courier_applications_status on public.courier_applications(status);
create index if not exists idx_courier_applications_user on public.courier_applications(user_id);

-- ============================================================
-- 5. BUSINESS APPLICATIONS TABLE
-- ============================================================

create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  status text not null default 'pending',
  -- business data
  business_name text not null,
  business_type text,
  category text,
  description text,
  phone text not null,
  whatsapp text,
  email text,
  city text,
  address text,
  lat double precision,
  lng double precision,
  schedule text,
  payment_methods jsonb default '[]'::jsonb,
  logo_url text,
  banner_url text,
  rut_url text,
  owner_name text not null,
  owner_document text not null,
  -- config
  avg_prep_time_minutes integer default 15,
  accepts_delivery boolean default true,
  accepts_pickup boolean default true,
  coverage_zones jsonb default '[]'::jsonb,
  -- terms
  accepted_terms boolean default false,
  accepted_privacy boolean default false,
  accepted_commission boolean default false,
  -- admin review
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp
);

create index if not exists idx_business_applications_status on public.business_applications(status);
create index if not exists idx_business_applications_user on public.business_applications(user_id);

-- ============================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- ============================================================

alter table public.support_tickets enable row level security;
alter table public.courier_applications enable row level security;
alter table public.business_applications enable row level security;

-- support_tickets: users see own, admins see all
create policy "Users can view own tickets"
on public.support_tickets for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Users can create tickets"
on public.support_tickets for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can update tickets"
on public.support_tickets for update
to authenticated
using (public.is_admin());

-- courier_applications: user sees own, admins see all
create policy "Users can view own courier application"
on public.courier_applications for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Users can create own courier application"
on public.courier_applications for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can update courier applications"
on public.courier_applications for update
to authenticated
using (public.is_admin());

-- business_applications: user sees own, admins see all
create policy "Users can view own business application"
on public.business_applications for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Users can create own business application"
on public.business_applications for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can update business applications"
on public.business_applications for update
to authenticated
using (public.is_admin());

-- ============================================================
-- 7. NOTIFICATIONS FOR APPLICATIONS
-- ============================================================

-- notify admin when new application is created
create or replace function notify_admin_new_application()
returns trigger as $$
declare
  admin_ids uuid[];
  aid uuid;
begin
  select array_agg(id) into admin_ids
  from profiles
  where role in ('super_admin', 'admin_general', 'admin_operativo', 'admin_soporte');
  
  foreach aid in array admin_ids loop
    insert into notifications (user_id, title, message, type, metadata)
    values (
      aid,
      case 
        when tg_table_name = 'courier_applications' then 'Nueva solicitud de repartidor'
        else 'Nueva solicitud de negocio'
      end,
      case 
        when tg_table_name = 'courier_applications' then new.full_name || ' quiere ser repartidor'
        else new.business_name || ' quiere registrar su negocio'
      end,
      'admin',
      jsonb_build_object(
        'application_id', new.id,
        'application_type', tg_table_name,
        'user_id', new.user_id,
        'status', new.status
      )
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger notify_admin_courier_application
after insert on public.courier_applications
for each row execute function notify_admin_new_application();

create trigger notify_admin_business_application
after insert on public.business_applications
for each row execute function notify_admin_new_application();
