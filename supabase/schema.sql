-- Connected — production schema for Supabase / Postgres.
-- The hackathon build runs on a JSON datastore (src/lib/server/store.ts); this is the drop-in target.
-- NOT yet wired into the app: swap getDb()/mutate() for queries against these tables.

create extension if not exists "pgcrypto";

-- ---------- people ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  pronouns text,
  headline text not null,
  role text not null check (role in ('student','professional','founder','mentor','researcher','organizer')),
  university text,
  major text,
  grad_year int,
  bio text default '',
  interests text[] not null default '{}',
  gives text[] not null default '{}',            -- "what I can help with in 15 minutes"
  ask text default '',
  looking_for text[] not null default '{}',      -- role ids
  open_to text[] not null default '{}',          -- collaboration types
  intros_offered text[] not null default '{}',   -- domains they will *consider* intros in
  availability text not null default 'medium' check (availability in ('high','medium','low')),
  area text default '',                          -- general area only; never precise location
  visibility text not null default 'everyone' check (visibility in ('everyone','events','hidden')),
  allow_requests boolean not null default true,
  avatar_hue int not null default 240,
  created_at timestamptz not null default now()
);

create table public.user_skills (
  user_id uuid references public.profiles (id) on delete cascade,
  skill text not null,
  level smallint not null check (level between 1 and 3),
  primary key (user_id, skill)
);

-- ---------- events ----------
create table public.events (
  id text primary key,
  title text not null,
  host text not null,
  kind text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  area text not null,
  tags text[] not null default '{}',
  zones jsonb not null default '[]',
  geo jsonb,                                     -- venue geofence; attendee distance is computed on-device
  is_sample boolean not null default false
);

create table public.memberships (
  event_id text references public.events (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  opt_in boolean not null default false,
  zone text,
  status jsonb,                                  -- {mode, topics, until, maxRequests}
  checked_in_at timestamptz,                     -- only the yes/no result of the on-device check
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index memberships_event_optin on public.memberships (event_id) where opt_in;

-- ---------- requests, interest, blocks ----------
create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'chat',
  ask text not null check (char_length(ask) between 12 and 400),
  message text not null default '',
  event_id text references public.events (id),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  meeting_spot text,
  score int,
  reasons text[] default '{}',
  outcomes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_id <> to_id)
);
create index requests_to on public.connection_requests (to_id, status);
create index requests_from on public.connection_requests (from_id, status);

create table public.quiet_interests (
  from_id uuid references public.profiles (id) on delete cascade,
  to_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);

create table public.blocks (
  user_id uuid references public.profiles (id) on delete cascade,
  blocked_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

-- ---------- teams, missions, messages, notifications ----------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  pitch text not null default '',
  event_id text references public.events (id),
  roles jsonb not null default '[]',
  open_roles text[] not null default '{}',
  coverage numeric not null default 0,
  status text not null default 'forming' check (status in ('forming','formed')),
  next_steps jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid references public.teams (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role_id text not null,
  status text not null check (status in ('owner','invited','accepted','declined')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (team_id, user_id)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  goal text not null,
  kind text not null,
  targets jsonb not null default '[]',
  event_id text references public.events (id),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,                       -- team id or request id
  from_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_thread on public.messages (thread_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.user_skills enable row level security;
alter table public.memberships enable row level security;
alter table public.connection_requests enable row level security;
alter table public.quiet_interests enable row level security;
alter table public.blocks enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.missions enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.events enable row level security;

create policy "events are public" on public.events for select using (true);

-- A profile is visible to: its owner; anyone if visibility = everyone; co-attendees who both opted in if 'events'.
create policy "profile visibility" on public.profiles for select using (
  id = auth.uid()
  or (
    not exists (select 1 from public.blocks b where (b.user_id = id and b.blocked_id = auth.uid()) or (b.user_id = auth.uid() and b.blocked_id = id))
    and (
      visibility = 'everyone'
      or (visibility = 'events' and exists (
        select 1 from public.memberships a join public.memberships m on a.event_id = m.event_id
        where a.user_id = auth.uid() and a.opt_in and m.user_id = profiles.id and m.opt_in))
    )
  )
);
create policy "edit own profile" on public.profiles for update using (id = auth.uid());
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());

create policy "skills follow profile" on public.user_skills for select using (exists (select 1 from public.profiles p where p.id = user_id));
create policy "own skills" on public.user_skills for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only opted-in members are visible to other opted-in members of the same event.
create policy "membership visibility" on public.memberships for select using (
  user_id = auth.uid()
  or (opt_in and exists (select 1 from public.memberships me where me.event_id = memberships.event_id and me.user_id = auth.uid() and me.opt_in))
);
create policy "own membership" on public.memberships for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "requests involve me" on public.connection_requests for select using (from_id = auth.uid() or to_id = auth.uid());
create policy "send requests" on public.connection_requests for insert with check (from_id = auth.uid());
create policy "update my requests" on public.connection_requests for update using (from_id = auth.uid() or to_id = auth.uid());

-- Quiet interest: you can only ever read your own outgoing rows (the match is computed server-side).
create policy "own interest" on public.quiet_interests for all using (from_id = auth.uid()) with check (from_id = auth.uid());
create policy "own blocks" on public.blocks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "team members read team" on public.teams for select using (
  owner_id = auth.uid() or exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid())
);
create policy "owner manages team" on public.teams for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read members" on public.team_members for select using (
  exists (select 1 from public.team_members me where me.team_id = team_members.team_id and me.user_id = auth.uid())
);
create policy "answer own invite" on public.team_members for update using (user_id = auth.uid());

create policy "own missions" on public.missions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications" on public.notifications for all using (user_id = auth.uid());
-- Messages: readable by team members or the two people on an accepted request (enforced in a SECURITY DEFINER rpc in production).
create policy "thread participants" on public.messages for select using (
  exists (select 1 from public.team_members tm where tm.team_id = thread_id and tm.user_id = auth.uid() and tm.status in ('owner','accepted'))
  or exists (select 1 from public.connection_requests r where r.id = thread_id and r.status = 'accepted' and auth.uid() in (r.from_id, r.to_id))
);
