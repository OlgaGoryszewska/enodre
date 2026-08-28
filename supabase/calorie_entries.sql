-- Admin dashboard daily calorie count.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.calorie_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_date date not null default current_date,
  calories integer not null check (calories >= 0),
  note text,
  constraint calorie_entries_one_per_day unique (entry_date)
);

alter table public.calorie_entries enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage calorie entries" on public.calorie_entries;
create policy "authenticated can manage calorie entries" on public.calorie_entries
  for all to authenticated using (true) with check (true);
