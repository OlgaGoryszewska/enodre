-- Admin dashboard: personal "learning" tracker (courses, skills, topics).
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  skill text,
  url text,
  is_completed boolean not null default false,
  note text
);

alter table public.learning_items enable row level security;

drop policy if exists "authenticated can manage learning items" on public.learning_items;
create policy "authenticated can manage learning items" on public.learning_items
  for all to authenticated using (true) with check (true);
