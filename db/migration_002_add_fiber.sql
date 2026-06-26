-- ============================================================
-- Migration 002 — Add fiber tracking
-- Run this in Supabase SQL Editor (your project already has the
-- Phase 1 schema applied, so this only adds the new columns).
-- Safe to re-run.
-- ============================================================

alter table meals
  add column if not exists fiber_g numeric(6,1) not null default 0;

alter table user_settings
  add column if not exists daily_fiber_goal_g numeric(6,1);

-- No RLS changes needed — Row Level Security policies are table-level,
-- so the existing policies already cover these new columns.
