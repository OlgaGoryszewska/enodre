-- Admin dashboard: personal "people who inspire me" list.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.inspiring_people (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  reason text,
  url text
);

alter table public.inspiring_people enable row level security;

drop policy if exists "authenticated can manage inspiring people" on public.inspiring_people;
create policy "authenticated can manage inspiring people" on public.inspiring_people
  for all to authenticated using (true) with check (true);
