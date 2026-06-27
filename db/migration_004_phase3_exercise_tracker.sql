-- ============================================================
-- Migration 004 — Phase 3: Exercise tracker
-- Run this in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Profile fields on user_settings
-- ------------------------------------------------------------
-- Calorie burn depends heavily on body weight, age, and sex — these
-- feed the exercise estimation prompt so Claude can personalize its
-- estimate instead of guessing for a generic adult.
alter table user_settings add column if not exists birth_year integer;
alter table user_settings add column if not exists height_in numeric(5,1);
alter table user_settings add column if not exists weight_lbs numeric(6,1);
alter table user_settings add column if not exists biological_sex text;
alter table user_settings add column if not exists activity_level text;

-- ------------------------------------------------------------
-- 2. exercises table
-- ------------------------------------------------------------
-- Mirrors the meals table: a single running list per day (no
-- sub-categories needed, since a day is usually one session, or a
-- session plus a dog walk). A future-dated row IS the plan for that
-- day — same pattern as the meal planner, no separate table needed.
create table if not exists exercises (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  logged_at         timestamptz not null default now(),
  name              text not null,
  description       text,
  duration_minutes  numeric(6,1) not null default 0,
  calories_burned   integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger exercises_set_updated_at
  before update on exercises
  for each row execute function set_updated_at();

create index if not exists exercises_user_logged_at_idx
  on exercises (user_id, logged_at desc);

-- Fast fuzzy search for "apply saved activities" (search + reuse),
-- same pg_trgm approach as meals.
create index if not exists exercises_name_trgm_idx
  on exercises using gin (name gin_trgm_ops);
create index if not exists exercises_description_trgm_idx
  on exercises using gin (description gin_trgm_ops);

alter table exercises enable row level security;

drop policy if exists "own exercises - select" on exercises;
create policy "own exercises - select" on exercises
  for select using (auth.uid() = user_id);

drop policy if exists "own exercises - insert" on exercises;
create policy "own exercises - insert" on exercises
  for insert with check (auth.uid() = user_id);

drop policy if exists "own exercises - update" on exercises;
create policy "own exercises - update" on exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own exercises - delete" on exercises;
create policy "own exercises - delete" on exercises
  for delete using (auth.uid() = user_id);
