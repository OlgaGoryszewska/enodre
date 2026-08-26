-- Admin dashboard daily mood tracker.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_date date not null default current_date,
  mood integer not null check (mood between 1 and 5),
  note text,
  -- one entry per day; saving again the same day overwrites it (upsert).
  constraint mood_entries_one_per_day unique (entry_date)
);

alter table public.mood_entries enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
create policy "authenticated can manage mood entries" on public.mood_entries
  for all to authenticated using (true) with check (true);
