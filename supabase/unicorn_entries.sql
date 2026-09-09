-- Admin dashboard "unicorns" tracker — logs which clients you sent an
-- Upwork proposal to each day, capped at 6 slots per day.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.unicorn_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_date date not null default current_date,
  companies text[] not null default '{}',
  constraint unicorn_entries_one_per_day unique (entry_date),
  constraint unicorn_entries_max_six check (coalesce(array_length(companies, 1), 0) <= 6)
);

alter table public.unicorn_entries enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage unicorn entries" on public.unicorn_entries;
create policy "authenticated can manage unicorn entries" on public.unicorn_entries
  for all to authenticated using (true) with check (true);
