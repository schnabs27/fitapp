-- ============================================================
-- Nutrition Tracker — Phase 1 Schema
-- Calories + Water + Goals + Searchable Meal History
-- Target: Supabase (PostgreSQL)
-- ============================================================
-- HOW TO RUN: Supabase dashboard > SQL Editor > New query >
--             paste this whole file > Run.
-- Safe to re-run: uses "if not exists" / "drop policy if exists".
-- ============================================================


-- ------------------------------------------------------------
-- 0. Extensions
-- ------------------------------------------------------------
-- pg_trgm powers fast case-insensitive ILIKE search across meal
-- names/descriptions — this is what makes your searchable
-- history quick even after thousands of entries.
create extension if not exists pg_trgm;


-- ------------------------------------------------------------
-- 1. updated_at helper
-- ------------------------------------------------------------
-- Stamps updated_at on every row change. Useful because editing
-- a previously logged meal is a core feature.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 2. user_settings  (one row per user)
-- ------------------------------------------------------------
create table if not exists user_settings (
  user_id              uuid primary key default auth.uid()
                         references auth.users (id) on delete cascade,
  daily_calorie_goal   integer not null default 1400,
  daily_water_goal_oz  integer not null default 70,
  -- Optional macro targets (null = not yet tracked as a goal)
  daily_carbs_goal_g   numeric(6,1),
  daily_protein_goal_g numeric(6,1),
  daily_fat_goal_g     numeric(6,1),
  -- Day boundaries (when a "day" starts/ends) are computed from this.
  -- >>> CHANGE THIS to your local zone, e.g. 'America/New_York'. <<<
  home_timezone        text not null default 'UTC',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on user_settings
  for each row execute function set_updated_at();


-- ------------------------------------------------------------
-- 3. meals  (core log + searchable history in one table)
-- ------------------------------------------------------------
-- Reuse = copy a found row's values into a NEW row dated today,
-- so each log stays independent and editing the past never
-- silently rewrites your history.
create table if not exists meals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  logged_at    timestamptz not null default now(),
  meal_type    text not null default 'breakfast'
                 check (meal_type in ('breakfast','lunch','dinner','snack')),
  name         text not null,
  description  text,                       -- raw text you typed + sent to Claude
  calories     integer       not null default 0,
  carbs_g      numeric(6,1)  not null default 0,
  protein_g    numeric(6,1)  not null default 0,
  fat_g        numeric(6,1)  not null default 0,
  portion      numeric(5,2)  not null default 1,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

create trigger meals_set_updated_at
  before update on meals
  for each row execute function set_updated_at();

-- Fast "what did I eat on day X" lookups
create index if not exists meals_user_logged_at_idx
  on meals (user_id, logged_at desc);

-- Fast fuzzy/ILIKE search for searchable history + reuse
create index if not exists meals_name_trgm_idx
  on meals using gin (name gin_trgm_ops);
create index if not exists meals_description_trgm_idx
  on meals using gin (description gin_trgm_ops);


-- ------------------------------------------------------------
-- 4. water_logs  (individual entries; dashboard sums per day)
-- ------------------------------------------------------------
create table if not exists water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  amount_oz   numeric(6,1) not null check (amount_oz > 0),
  logged_at   timestamptz  not null default now(),
  created_at  timestamptz  not null default now()
);

create index if not exists water_logs_user_logged_at_idx
  on water_logs (user_id, logged_at desc);


-- ============================================================
-- 5. Row Level Security
-- ============================================================
-- Even as the only user, everything is scoped to the logged-in
-- user. Nothing is readable or writable without a valid session.

alter table user_settings enable row level security;
alter table meals         enable row level security;
alter table water_logs    enable row level security;

-- ---- user_settings ----
drop policy if exists "own settings - select" on user_settings;
create policy "own settings - select" on user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "own settings - insert" on user_settings;
create policy "own settings - insert" on user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "own settings - update" on user_settings;
create policy "own settings - update" on user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- meals ----
drop policy if exists "own meals - select" on meals;
create policy "own meals - select" on meals
  for select using (auth.uid() = user_id);

drop policy if exists "own meals - insert" on meals;
create policy "own meals - insert" on meals
  for insert with check (auth.uid() = user_id);

drop policy if exists "own meals - update" on meals;
create policy "own meals - update" on meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own meals - delete" on meals;
create policy "own meals - delete" on meals
  for delete using (auth.uid() = user_id);

-- ---- water_logs ----
drop policy if exists "own water - select" on water_logs;
create policy "own water - select" on water_logs
  for select using (auth.uid() = user_id);

drop policy if exists "own water - insert" on water_logs;
create policy "own water - insert" on water_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own water - update" on water_logs;
create policy "own water - update" on water_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own water - delete" on water_logs;
create policy "own water - delete" on water_logs
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Done. Next: create your auth user, then the app upserts your
-- one user_settings row on first load.
-- ============================================================
