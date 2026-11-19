-- Christmas Feast 2026 - database schema (Supabase / any Postgres 14+).
--
-- Everything lives in a private "xmas" schema, which Supabase does NOT expose
-- through its public REST/GraphQL APIs. The app connects as a dedicated
-- least-privilege role (see 002_app_role.sql) rather than as postgres.

create schema if not exists xmas;

create table if not exists xmas.orders (
  id              uuid primary key,
  name            text not null check (char_length(name) between 1 and 30),
  -- lower-cased, accent-free name: stops the same person ordering twice,
  -- even if two requests race each other
  name_key        text not null unique,
  starter         text not null,
  starter_option  text not null default '',
  main            text not null,
  main_option     text not null default '',
  dessert         text not null,
  dessert_option  text not null default '',
  notes           text not null default '' check (char_length(notes) <= 60),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- The header section of the restaurant's booking form (a single row).
create table if not exists xmas.booking_details (
  id          smallint primary key default 1 check (id = 1),
  details     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Failed-login counters for brute-force protection.
create table if not exists xmas.rate_limits (
  key         text primary key,
  count       integer not null,
  expires_at  timestamptz not null
);

alter table xmas.orders enable row level security;
alter table xmas.booking_details enable row level security;
alter table xmas.rate_limits enable row level security;

-- Nobody but the app role (and admins) may touch this schema.
revoke all on schema xmas from public;
revoke all on all tables in schema xmas from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema xmas from anon, authenticated';
    execute 'revoke all on all tables in schema xmas from anon, authenticated';
  end if;
end $$;
