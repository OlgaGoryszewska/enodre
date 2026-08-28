-- Admin dashboard: spend report for each AI job-match search run.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.ai_search_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_date date not null default current_date,
  model text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  web_search_requests integer not null,
  matches_found integer not null,
  estimated_cost_usd numeric(10, 4) not null
);

alter table public.ai_search_runs add column if not exists web_fetch_requests integer not null default 0;

alter table public.ai_search_runs enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage ai search runs" on public.ai_search_runs;
create policy "authenticated can manage ai search runs" on public.ai_search_runs
  for all to authenticated using (true) with check (true);
