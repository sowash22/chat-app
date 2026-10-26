-- Public channels
-- Paste this whole file into the Supabase SQL Editor and run it once,
-- after 0001_chat.sql has already been applied.
-- The SQL Editor runs the script as one transaction; a failure rolls the paste back.
--
-- Safe to run again: indexes use IF NOT EXISTS and functions use CREATE OR REPLACE.
-- Does not rewrite the 0001 tables. Does not widen conversation or message
-- select policies. Discovery goes through list_public_channels(), which
-- returns only public channels.
--
-- Assumes the same hosted project as 0001:
--   * this script runs as postgres (superuser, table owner)
--   * security definer functions bypass RLS
--   * do not enable FORCE ROW LEVEL SECURITY on these tables

-- ---------------------------------------------------------------------------
-- Channel names are unique case-insensitively. Multiple null dm_key values
-- stay allowed (UNIQUE NULLS DISTINCT on conversations.dm_key).
-- ---------------------------------------------------------------------------

create unique index if not exists conversations_channel_name_lower_idx
  on public.conversations (lower(name))
  where type = 'channel' and name is not null;

-- ---------------------------------------------------------------------------
-- create_channel(channel_name text) returns public.conversations
-- ---------------------------------------------------------------------------

create or replace function public.create_channel(channel_name text)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  cleaned text;
  conversation public.conversations;
begin
  if caller_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  cleaned := btrim(channel_name);

  if cleaned is null
     or char_length(cleaned) < 1
     or char_length(cleaned) > 80
     or cleaned ~ '[[:cntrl:]]' then
    raise exception 'channel name must be 1 to 80 characters'
      using errcode = '22023';
  end if;

  insert into public.conversations (
    type,
    dm_key,
    name,
    visibility,
    created_by
  )
  values ('channel', null, cleaned, 'public', caller_id)
  returning * into conversation;

  insert into public.conversation_members (conversation_id, user_id)
  values (conversation.id, caller_id);

  return conversation;
exception
  when unique_violation then
    raise exception 'a channel with this name already exists'
      using errcode = '23505';
end;
$$;

comment on function public.create_channel(text) is
  'Create a public channel named channel_name and add auth.uid() as a member.';

-- ---------------------------------------------------------------------------
-- join_public_channel(conversation_id uuid) returns public.conversations
-- ---------------------------------------------------------------------------

create or replace function public.join_public_channel(conversation_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  conversation public.conversations;
begin
  if caller_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  if join_public_channel.conversation_id is null then
    raise exception 'conversation_id is required'
      using errcode = '22023';
  end if;

  select *
  into conversation
  from public.conversations as c
  where c.id = join_public_channel.conversation_id
    and c.type = 'channel'
    and c.visibility = 'public'
    and c.dm_key is null;

  if not found then
    raise exception 'channel not found'
      using errcode = 'P0002';
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (conversation.id, caller_id)
  on conflict on constraint conversation_members_pkey do nothing;

  return conversation;
end;
$$;

comment on function public.join_public_channel(uuid) is
  'Add auth.uid() to a public channel. No change if they are already a member.';

-- ---------------------------------------------------------------------------
-- leave_channel(conversation_id uuid) returns void
-- ---------------------------------------------------------------------------

create or replace function public.leave_channel(conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  conversation public.conversations;
  caller_is_member boolean;
begin
  if caller_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  if leave_channel.conversation_id is null then
    raise exception 'conversation_id is required'
      using errcode = '22023';
  end if;

  select *
  into conversation
  from public.conversations as c
  where c.id = leave_channel.conversation_id;

  if not found then
    raise exception 'channel not found'
      using errcode = 'P0002';
  end if;

  caller_is_member := exists (
    select 1
    from public.conversation_members as m
    where m.conversation_id = conversation.id
      and m.user_id = caller_id
  );

  if conversation.type <> 'channel' or conversation.dm_key is not null then
    if not caller_is_member then
      raise exception 'channel not found'
        using errcode = 'P0002';
    end if;

    raise exception 'cannot leave a direct message'
      using errcode = '42501';
  end if;

  delete from public.conversation_members as m
  where m.conversation_id = conversation.id
    and m.user_id = caller_id;
end;
$$;

comment on function public.leave_channel(uuid) is
  'Remove auth.uid() from a channel, including one they created. Direct messages cannot be left.';

-- ---------------------------------------------------------------------------
-- list_public_channels() returns id, name, visibility, joined
-- ---------------------------------------------------------------------------

create or replace function public.list_public_channels()
returns table (
  id uuid,
  name text,
  visibility text,
  joined boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  return query
  select
    c.id,
    c.name,
    c.visibility,
    exists (
      select 1
      from public.conversation_members as m
      where m.conversation_id = c.id
        and m.user_id = auth.uid()
    ) as joined
  from public.conversations as c
  where c.type = 'channel'
    and c.visibility = 'public'
    and c.dm_key is null
    and c.name is not null
  order by lower(c.name), c.id;
end;
$$;

comment on function public.list_public_channels() is
  'List public channels for auth.uid(), with joined true when they are already a member. Omits direct messages.';

revoke all on function public.create_channel(text) from public, anon;
revoke all on function public.join_public_channel(uuid) from public, anon;
revoke all on function public.leave_channel(uuid) from public, anon;
revoke all on function public.list_public_channels() from public, anon;

grant execute on function public.create_channel(text) to authenticated;
grant execute on function public.join_public_channel(uuid) to authenticated;
grant execute on function public.leave_channel(uuid) to authenticated;
grant execute on function public.list_public_channels() to authenticated;

notify pgrst, 'reload schema';
