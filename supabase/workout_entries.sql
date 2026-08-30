-- Admin dashboard "workout of the day" tracker.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_date date not null default current_date,
  workout text not null,
  duration_minutes integer check (duration_minutes >= 0),
  constraint workout_entries_one_per_day unique (entry_date)
);

alter table public.workout_entries enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage workout entries" on public.workout_entries;
create policy "authenticated can manage workout entries" on public.workout_entries
  for all to authenticated using (true) with check (true);

-- Migration for a table created before Run got its own numeric fields —
-- idempotent, no-ops if the table was just created fresh above.
alter table public.workout_entries add column if not exists distance_km numeric check (distance_km >= 0);
alter table public.workout_entries add column if not exists calories_burned integer check (calories_burned >= 0);
