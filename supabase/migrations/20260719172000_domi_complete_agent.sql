begin;

alter table public.domi_user_settings
  add column if not exists voice_enabled boolean not null default true,
  add column if not exists speech_output_enabled boolean not null default true,
  add column if not exists learning_enabled boolean not null default true,
  add column if not exists proactive_frequency text not null default 'important_only',
  add column if not exists proactive_channel text not null default 'in_app',
  add column if not exists quiet_hours_start time,
  add column if not exists quiet_hours_end time,
  add column if not exists preferred_language text not null default 'es-CO';

alter table public.domi_user_settings
  drop constraint if exists domi_user_settings_proactive_frequency_check,
  add constraint domi_user_settings_proactive_frequency_check
    check (proactive_frequency in ('off', 'important_only', 'daily', 'realtime')),
  drop constraint if exists domi_user_settings_proactive_channel_check,
  add constraint domi_user_settings_proactive_channel_check
    check (proactive_channel in ('in_app', 'push', 'email'));

create table if not exists public.domi_order_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.domi_conversations(id) on delete set null,
  business_id uuid not null references public.businesses(id) on delete restrict,
  address_id uuid references public.addresses(id) on delete set null,
  coupon_id uuid references public.coupons(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'converted', 'cancelled', 'expired')),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0 check (subtotal >= 0),
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  service_fee numeric not null default 0 check (service_fee >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  payment_method text,
  special_instructions text,
  source text not null default 'domi',
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  converted_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.domi_learning_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.domi_conversations(id) on delete set null,
  source_message_id uuid references public.domi_messages(id) on delete set null,
  candidate_type text not null check (candidate_type in ('correction', 'preference_pattern', 'knowledge', 'tool_gap', 'response_quality')),
  title text not null,
  content text not null,
  normalized_content text not null,
  evidence jsonb not null default '{}'::jsonb,
  audience_role public.user_role,
  private_scope boolean not null default true,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'deployed')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  deployed_article_id uuid references public.domi_knowledge_articles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.domi_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.domi_conversations(id) on delete cascade,
  message_id uuid references public.domi_messages(id) on delete set null,
  rating smallint not null check (rating in (-1, 1)),
  category text not null default 'general' check (category in ('general', 'accuracy', 'helpfulness', 'tone', 'tool_result', 'safety')),
  comment text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.domi_proactive_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('order_delay', 'draft_pending', 'coupon_expiring', 'favorite_available', 'conversation_goal', 'system_notice')),
  title text not null,
  message text not null,
  action_url text,
  fingerprint text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'read', 'dismissed', 'expired')),
  metadata jsonb not null default '{}'::jsonb,
  deliver_after timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table if not exists public.domi_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.domi_conversations(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'interrupted', 'failed')),
  language text not null default 'es-CO',
  transcript_count integer not null default 0 check (transcript_count >= 0),
  last_transcript text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_domi_order_drafts_user_status
  on public.domi_order_drafts(user_id, status, updated_at desc);
create index if not exists idx_domi_learning_candidates_status
  on public.domi_learning_candidates(status, created_at desc);
create index if not exists idx_domi_evaluations_conversation
  on public.domi_evaluations(conversation_id, created_at desc);
create index if not exists idx_domi_proactive_events_delivery
  on public.domi_proactive_events(user_id, status, deliver_after, priority);
create index if not exists idx_domi_voice_sessions_user
  on public.domi_voice_sessions(user_id, started_at desc);

alter table public.domi_order_drafts enable row level security;
alter table public.domi_learning_candidates enable row level security;
alter table public.domi_evaluations enable row level security;
alter table public.domi_proactive_events enable row level security;
alter table public.domi_voice_sessions enable row level security;

drop policy if exists domi_order_drafts_owner_select on public.domi_order_drafts;
create policy domi_order_drafts_owner_select on public.domi_order_drafts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists domi_evaluations_owner_select on public.domi_evaluations;
create policy domi_evaluations_owner_select on public.domi_evaluations
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists domi_proactive_events_owner_select on public.domi_proactive_events;
create policy domi_proactive_events_owner_select on public.domi_proactive_events
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists domi_voice_sessions_owner_select on public.domi_voice_sessions;
create policy domi_voice_sessions_owner_select on public.domi_voice_sessions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists domi_learning_candidates_admin_select on public.domi_learning_candidates;
create policy domi_learning_candidates_admin_select on public.domi_learning_candidates
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

revoke all on public.domi_order_drafts from anon, authenticated;
revoke all on public.domi_learning_candidates from anon, authenticated;
revoke all on public.domi_evaluations from anon, authenticated;
revoke all on public.domi_proactive_events from anon, authenticated;
revoke all on public.domi_voice_sessions from anon, authenticated;

grant select on public.domi_order_drafts to authenticated;
grant select on public.domi_evaluations to authenticated;
grant select on public.domi_proactive_events to authenticated;
grant select on public.domi_voice_sessions to authenticated;
grant select on public.domi_learning_candidates to authenticated;

comment on table public.domi_order_drafts is 'Reversible purchase preparations created by Domi before manual checkout and payment.';
comment on table public.domi_learning_candidates is 'Supervised learning candidates that require human review before becoming global knowledge.';
comment on table public.domi_evaluations is 'Explicit user feedback about Domi responses.';
comment on table public.domi_proactive_events is 'Consent-controlled in-app proactive assistance generated from verified DomiU data.';
comment on table public.domi_voice_sessions is 'Auditable voice interactions without storing audio recordings.';

commit;
