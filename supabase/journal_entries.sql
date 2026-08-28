-- Admin dashboard daily journal (part of the Mental health section).
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_date date not null default current_date,
  entry text not null,
  constraint journal_entries_one_per_day unique (entry_date)
);

alter table public.journal_entries enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage journal entries" on public.journal_entries;
create policy "authenticated can manage journal entries" on public.journal_entries
  for all to authenticated using (true) with check (true);
