-- ============================================================
-- Migration 003 — Replace "carbs" with "sugar" as a tracked macro
-- Run this in Supabase SQL Editor. Safe to re-run (checks existence
-- before renaming).
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'meals' and column_name = 'carbs_g'
  ) then
    alter table meals rename column carbs_g to sugar_g;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'user_settings' and column_name = 'daily_carbs_goal_g'
  ) then
    alter table user_settings rename column daily_carbs_goal_g to daily_sugar_goal_g;
  end if;
end $$;

-- Existing values carry over as-is (renaming a column keeps its data).
-- Note: your historical "carbs" numbers now live under "sugar_g" — if you
-- want to re-estimate past meals for accurate sugar figures, you'll need
-- to edit them individually; this migration only renames the column.
