-- Admin dashboard: manually-added LinkedIn job leads.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.linkedin_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  company text,
  url text not null
);

alter table public.linkedin_jobs add column if not exists proposal_sent boolean not null default false;
alter table public.linkedin_jobs add column if not exists note text;

alter table public.linkedin_jobs enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage linkedin jobs" on public.linkedin_jobs;
create policy "authenticated can manage linkedin jobs" on public.linkedin_jobs
  for all to authenticated using (true) with check (true);
