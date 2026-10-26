-- Slack DM POC
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- The SQL Editor runs the script as one transaction; a failure rolls the paste back.
--
-- Assumes a hosted Supabase project:
--   * PostgreSQL 15+ (UNIQUE NULLS DISTINCT)
--   * publication supabase_realtime already exists
--   * this script runs as postgres (superuser, table owner), so security definer
--     functions bypass RLS. Do not enable FORCE ROW LEVEL SECURITY on these tables.
--   * auth.uid() and auth.users are present
--
-- Re-running the whole file fails on CREATE TABLE. The publication block alone
-- is safe to run again.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.conversations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  type text not null default 'dm' check (type in ('dm', 'channel')),
  dm_key text,
  name text,
  visibility text not null default 'private',
  created_by uuid not null references auth.users (id),
  next_sequence bigint not null default 0,
  created_at timestamptz not null default pg_catalog.now(),
  constraint conversations_dm_key_key unique nulls distinct (dm_key),
  constraint conversations_dm_key_matches_type check (
    (type = 'dm' and dm_key is not null)
    or (type = 'channel' and dm_key is null)
  )
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default pg_catalog.now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  client_message_id uuid not null,
  sequence bigint not null,
  content text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint messages_content_length check (char_length(content) between 1 and 4000),
  constraint messages_sender_client_message_key unique (sender_id, client_message_id),
  -- Unique constraint creates the (conversation_id, sequence) index.
  constraint messages_conversation_id_sequence_idx unique (conversation_id, sequence)
);

comment on constraint messages_conversation_id_sequence_idx on public.messages is
  'Supports history reads ordered by sequence within a conversation.';

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Supabase default privileges grant all to anon and authenticated.
-- Clients may select. Writes go through the security definer functions.
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.conversation_members from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select on table public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Membership helper
-- security definer so conversation policies can read membership without
-- recursing through RLS on conversation_members. Schema private is outside
-- the Data API (PostgREST exposes public only).
-- ---------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.conversation_members as m
      where m.conversation_id = target_conversation_id
        and m.user_id = auth.uid()
    );
$$;

revoke all on function private.is_conversation_member(uuid) from public, anon;
grant execute on function private.is_conversation_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy conversations_select_member
  on public.conversations
  for select
  to authenticated
  using (private.is_conversation_member(id));

create policy conversation_members_select_member
  on public.conversation_members
  for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

create policy messages_select_member
  on public.messages
  for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

-- ---------------------------------------------------------------------------
-- Profile row for each new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'user')
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- open_direct_conversation(recipient_id uuid) returns public.conversations
-- ---------------------------------------------------------------------------

create or replace function public.open_direct_conversation(recipient_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  low_id text;
  high_id text;
  key text;
  conversation public.conversations;
begin
  if caller_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  if recipient_id is null then
    raise exception 'recipient_id is required'
      using errcode = '22023';
  end if;

  if recipient_id = caller_id then
    raise exception 'cannot open a direct conversation with yourself'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users as u
    where u.id = recipient_id
  ) then
    raise exception 'recipient not found'
      using errcode = 'P0002';
  end if;

  if caller_id::text < recipient_id::text then
    low_id := caller_id::text;
    high_id := recipient_id::text;
  else
    low_id := recipient_id::text;
    high_id := caller_id::text;
  end if;

  key := low_id || ':' || high_id;

  insert into public.conversations (type, dm_key, visibility, created_by)
  values ('dm', key, 'private', caller_id)
  on conflict (dm_key) do nothing
  returning * into conversation;

  if not found then
    select *
    into strict conversation
    from public.conversations as c
    where c.dm_key = key;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (conversation.id, caller_id),
    (conversation.id, recipient_id)
  on conflict (conversation_id, user_id) do nothing;

  return conversation;
end;
$$;

comment on function public.open_direct_conversation(uuid) is
  'Open the unique DM between auth.uid() and recipient_id. Returns the conversations row.';

-- ---------------------------------------------------------------------------
-- send_message(conversation_id uuid, client_message_id uuid, content text)
-- returns public.messages
-- ---------------------------------------------------------------------------

create or replace function public.send_message(
  conversation_id uuid,
  client_message_id uuid,
  content text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  existing public.messages;
  next_seq bigint;
  inserted public.messages;
begin
  if caller_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.conversation_members as m
    where m.conversation_id = send_message.conversation_id
      and m.user_id = caller_id
  ) then
    raise exception 'not a member of this conversation'
      using errcode = '42501';
  end if;

  select *
  into existing
  from public.messages as m
  where m.sender_id = caller_id
    and m.client_message_id = send_message.client_message_id;

  if found then
    if existing.conversation_id = send_message.conversation_id
       and existing.content = send_message.content then
      return existing;
    end if;

    raise exception 'client_message_id already used with different conversation or content'
      using errcode = '23505';
  end if;

  if send_message.content is null
     or char_length(send_message.content) < 1
     or char_length(send_message.content) > 4000 then
    raise exception 'content length must be between 1 and 4000 characters'
      using errcode = '23514';
  end if;

  update public.conversations as c
  set next_sequence = c.next_sequence + 1
  where c.id = send_message.conversation_id
  returning c.next_sequence into next_seq;

  if next_seq is null then
    raise exception 'conversation not found'
      using errcode = 'P0002';
  end if;

  begin
    insert into public.messages (
      conversation_id,
      sender_id,
      client_message_id,
      sequence,
      content
    )
    values (
      send_message.conversation_id,
      caller_id,
      send_message.client_message_id,
      next_seq,
      send_message.content
    )
    returning * into inserted;

    return inserted;
  exception
    when unique_violation then
      select *
      into existing
      from public.messages as m
      where m.sender_id = caller_id
        and m.client_message_id = send_message.client_message_id;

      if found
         and existing.conversation_id = send_message.conversation_id
         and existing.content = send_message.content then
        return existing;
      end if;

      if found then
        raise exception 'client_message_id already used with different conversation or content'
          using errcode = '23505';
      end if;

      raise;
  end;
end;
$$;

comment on function public.send_message(uuid, uuid, text) is
  'Insert a message for auth.uid() or return the existing row for the same client_message_id and content.';

revoke all on function public.open_direct_conversation(uuid) from public, anon;
revoke all on function public.send_message(uuid, uuid, text) from public, anon;

grant usage on schema public to authenticated;
grant execute on function public.open_direct_conversation(uuid) to authenticated;
grant execute on function public.send_message(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception 'publication supabase_realtime does not exist';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

notify pgrst, 'reload schema';
