-- Admin dashboard: manually-added Upwork job leads.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.upwork_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  company text,
  url text not null,
  proposal_sent boolean not null default false,
  note text
);

alter table public.upwork_jobs enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage upwork jobs" on public.upwork_jobs;
create policy "authenticated can manage upwork jobs" on public.upwork_jobs
  for all to authenticated using (true) with check (true);
