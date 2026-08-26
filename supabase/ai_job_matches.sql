-- Admin dashboard: daily AI-curated job matches (Claude web search).
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.ai_job_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  match_date date not null default current_date,
  title text not null,
  company text,
  url text not null,
  reasoning text,
  source text
);

alter table public.ai_job_matches enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage ai job matches" on public.ai_job_matches;
create policy "authenticated can manage ai job matches" on public.ai_job_matches
  for all to authenticated using (true) with check (true);
