-- Admin dashboard Upwork proposals counter — how many proposals you sent
-- each day, capped at 6 per day. Pure tally, no client names stored.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.unicorn_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_date date not null default current_date,
  count integer not null default 0,
  constraint unicorn_entries_one_per_day unique (entry_date)
);

alter table public.unicorn_entries enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage unicorn entries" on public.unicorn_entries;
create policy "authenticated can manage unicorn entries" on public.unicorn_entries
  for all to authenticated using (true) with check (true);

-- Simplified from a per-name companies[] column to a plain daily count —
-- idempotent, no-ops if the table was just created fresh above.
alter table public.unicorn_entries add column if not exists count integer not null default 0;
alter table public.unicorn_entries drop column if exists companies;
alter table public.unicorn_entries drop constraint if exists unicorn_entries_max_six;
alter table public.unicorn_entries drop constraint if exists unicorn_entries_count_range;
alter table public.unicorn_entries add constraint unicorn_entries_count_range check (count between 0 and 6);
