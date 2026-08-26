-- Admin calendar events table.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  constraint events_end_after_start check (end_time > start_time)
);

alter table public.events enable row level security;

-- Single-admin, admin-only table — one policy covering all actions is
-- correct here (unlike contacts.sql, which splits anon-insert from
-- authenticated-read/update because it has two distinct actors).
create policy "authenticated can manage events" on public.events
  for all to authenticated using (true) with check (true);
