-- Connected. database schema.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
-- Safe to run again: it only creates what's missing and replaces policies and functions.
--
-- Privacy is enforced here, in the database, so the app can't leak data even if it has a bug:
--   * Profiles are visible only when discoverable (or when you share a request), never across a block.
--   * Locations are stored at neighborhood level (rounded to ~1 km); "public places only" stores none.
--   * Requests and messages are visible only to the two people involved.
--   * Messages can only be sent after a request is accepted.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  status text,
  org text not null default '',
  intro text not null default '',
  offer text not null default '',
  field text,
  from_field text,
  mode text not null default 'seeking',
  goals text[] not null default '{}',
  challenges text[] not null default '{}',
  want_traits text[] not null default '{}',
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  languages text[] not null default '{English}',
  foods text[] not null default '{}',
  diet text[] not null default '{}',
  availability text[] not null default '{}',
  meet_mode text not null default 'either',
  share_mode text not null default 'public',
  discoverable boolean not null default true,
  area_name text,
  area_lat double precision,
  area_lng double precision,
  updated_at timestamptz not null default now(),
  constraint profiles_name_len check (char_length(first_name) <= 60 and char_length(last_name) <= 60),
  constraint profiles_text_len check (char_length(intro) <= 400 and char_length(offer) <= 300 and char_length(org) <= 120)
);

create table if not exists public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade default auth.uid(),
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade default auth.uid(),
  to_user uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 600),
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user <> to_user)
);

-- At most one open (requested/accepted) connection between any two people.
create unique index if not exists connection_requests_one_open
  on public.connection_requests (least(from_user, to_user), greatest(from_user, to_user))
  where status in ('requested', 'accepted');
create index if not exists connection_requests_to_user on public.connection_requests (to_user);
create index if not exists connection_requests_from_user on public.connection_requests (from_user);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.connection_requests (id) on delete cascade,
  sender uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_request on public.messages (request_id, created_at);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users (id) on delete cascade default auth.uid(),
  reported uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when either person has blocked the other. Security definer so it can see both rows.
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- True when the two people have any request between them (so names still show in the inbox).
create or replace function public.has_connection(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connection_requests
    where (from_user = a and to_user = b) or (from_user = b and to_user = a)
  );
$$;

create or replace function public.is_participant(req uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connection_requests
    where id = req and auth.uid() in (from_user, to_user)
  );
$$;

-- Profiles: keep location coarse, and store none for "public places only".
create or replace function public.profiles_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.share_mode = 'public' then
    new.area_lat := null;
    new.area_lng := null;
  else
    new.area_lat := round(new.area_lat::numeric, 2)::double precision;
    new.area_lng := round(new.area_lng::numeric, 2)::double precision;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- Requests: only status can change, and only in allowed ways.
create or replace function public.requests_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.from_user <> old.from_user or new.to_user <> old.to_user or new.message <> old.message or new.created_at <> old.created_at then
    raise exception 'Only the status of a request can change';
  end if;
  if new.status = old.status then
    return new;
  end if;
  if new.status in ('accepted', 'declined') and not (old.status = 'requested' and auth.uid() = old.to_user) then
    raise exception 'Only the recipient can accept or decline a pending request';
  end if;
  if new.status = 'cancelled' and not (old.status in ('requested', 'accepted') and auth.uid() in (old.from_user, old.to_user)) then
    raise exception 'This request can no longer be cancelled';
  end if;
  if new.status = 'requested' then
    raise exception 'A request cannot go back to pending';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists requests_before_update on public.connection_requests;
create trigger requests_before_update
  before update on public.connection_requests
  for each row execute function public.requests_before_update();

-- People near a point, within radius_mi. Runs with the caller's permissions, so RLS applies.
create or replace function public.nearby_profiles(lat double precision, lng double precision, radius_mi double precision default 25)
returns setof public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id <> auth.uid()
    and p.discoverable
    and p.area_lat is not null
    and p.area_lat between lat - radius_mi / 69.0 and lat + radius_mi / 69.0
    and 3958.8 * 2 * asin(sqrt(
          power(sin(radians(p.area_lat - lat) / 2), 2) +
          cos(radians(lat)) * cos(radians(p.area_lat)) * power(sin(radians(p.area_lng - lng) / 2), 2)
        )) <= radius_mi
  limit 300;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.connection_requests enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles: read visible" on public.profiles;
create policy "profiles: read visible" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      not public.is_blocked(auth.uid(), id)
      and (discoverable or public.has_connection(auth.uid(), id))
    )
  );

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own" on public.profiles
  for delete to authenticated using (id = auth.uid());

drop policy if exists "blocks: own" on public.blocks;
create policy "blocks: own" on public.blocks
  for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());

drop policy if exists "requests: participants read" on public.connection_requests;
create policy "requests: participants read" on public.connection_requests
  for select to authenticated using (auth.uid() in (from_user, to_user));

drop policy if exists "requests: send" on public.connection_requests;
create policy "requests: send" on public.connection_requests
  for insert to authenticated
  with check (from_user = auth.uid() and status = 'requested' and not public.is_blocked(from_user, to_user));

drop policy if exists "requests: participants update" on public.connection_requests;
create policy "requests: participants update" on public.connection_requests
  for update to authenticated
  using (auth.uid() in (from_user, to_user))
  with check (auth.uid() in (from_user, to_user));

drop policy if exists "messages: participants read" on public.messages;
create policy "messages: participants read" on public.messages
  for select to authenticated using (public.is_participant(request_id));

drop policy if exists "messages: send when accepted" on public.messages;
create policy "messages: send when accepted" on public.messages
  for insert to authenticated
  with check (
    sender = auth.uid()
    and exists (
      select 1 from public.connection_requests r
      where r.id = request_id and r.status = 'accepted' and auth.uid() in (r.from_user, r.to_user)
    )
  );

drop policy if exists "reports: file own" on public.reports;
create policy "reports: file own" on public.reports
  for insert to authenticated with check (reporter = auth.uid());

-- ---------------------------------------------------------------------------
-- Access for signed-in users only (RLS above decides which rows)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.blocks, public.connection_requests, public.messages, public.reports from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update on public.connection_requests to authenticated;
grant select, insert on public.messages to authenticated;
grant insert on public.reports to authenticated;
grant execute on function public.nearby_profiles(double precision, double precision, double precision) to authenticated;
grant execute on function public.is_blocked(uuid, uuid), public.has_connection(uuid, uuid), public.is_participant(uuid) to authenticated;
revoke execute on function public.nearby_profiles(double precision, double precision, double precision) from anon;

-- ---------------------------------------------------------------------------
-- Live updates for requests and messages
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'connection_requests') then
    alter publication supabase_realtime add table public.connection_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
