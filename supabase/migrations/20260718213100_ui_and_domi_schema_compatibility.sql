-- Compatibilidad de lectura para la interfaz de jornadas.
create or replace view public.operation_sessions
with (security_invoker = true)
as
select
  s.id,
  s.participant_type as session_type,
  case when s.participant_type = 'courier' then s.participant_id else s.opened_by end as actor_id,
  case when s.participant_type = 'business' then s.participant_id else null end as business_id,
  s.status,
  s.opened_at,
  s.closed_at,
  s.online_seconds,
  s.opening_note,
  s.closing_note,
  s.opened_by,
  s.closed_by,
  s.metadata,
  s.created_at,
  s.updated_at
from public.operational_shifts s;

-- El esquema inicial de Domi ya existía. Estas columnas mantienen compatibilidad
-- con la nueva interfaz sin eliminar conversaciones anteriores.
alter table public.domi_conversations
  add column if not exists role_scope text,
  add column if not exists context_snapshot jsonb not null default '{}'::jsonb;

update public.domi_conversations
set role_scope = role::text
where role_scope is null;

create or replace function public.sync_domi_conversation_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role_scope is null and new.role is not null then
    new.role_scope := new.role::text;
  elsif new.role_scope is not null then
    new.role := new.role_scope::public.user_role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_domi_conversation_role on public.domi_conversations;
create trigger trg_sync_domi_conversation_role
before insert or update of role,role_scope on public.domi_conversations
for each row execute function public.sync_domi_conversation_role();

alter table public.domi_messages
  add column if not exists sender_type text,
  add column if not exists tool_name text,
  add column if not exists tool_result jsonb,
  add column if not exists safety_labels text[] not null default '{}';

update public.domi_messages
set sender_type = role
where sender_type is null;

create or replace function public.sync_domi_message_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.sender_type is null and new.role is not null then
    new.sender_type := new.role;
  elsif new.sender_type is not null then
    new.role := new.sender_type;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_domi_message_role on public.domi_messages;
create trigger trg_sync_domi_message_role
before insert or update of role,sender_type on public.domi_messages
for each row execute function public.sync_domi_message_role();
