-- Admin dashboard: personal "things to watch" tracker.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.things_to_watch (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  watch_type text,
  url text,
  is_watched boolean not null default false,
  note text
);

alter table public.things_to_watch enable row level security;

drop policy if exists "authenticated can manage things to watch" on public.things_to_watch;
create policy "authenticated can manage things to watch" on public.things_to_watch
  for all to authenticated using (true) with check (true);
