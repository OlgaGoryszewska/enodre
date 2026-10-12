-- Admin dashboard: lead-finder agent review queue.
-- The Finder agent (Brønnøysundregistrene) adds companies here; the Researcher
-- agent (Claude + web search) fills `research`. Approving a candidate copies it
-- into public.potential_customers — this table is the queue, not the pipeline.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- Requires potential_customers.sql to have been run first.

create table if not exists public.lead_candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  org_number text not null unique,
  company text not null,
  industry_code text,
  industry_label text,
  employees integer,
  municipality text,
  address text,
  phone text,
  website text,
  founded date,
  contact_name text,
  contact_role text,
  -- keep in sync with LEAD_CANDIDATE_STATUS_VALUES in src/lib/lead-candidate.ts
  status text not null default 'found'
    check (status in ('found', 'researched', 'failed', 'approved', 'rejected')),
  research jsonb,
  fit_score integer,
  error text,
  cost_usd numeric(10, 4),
  researched_at timestamptz,
  potential_customer_id uuid references public.potential_customers(id) on delete set null
);

create index if not exists lead_candidates_status_idx on public.lead_candidates (status, fit_score desc);

alter table public.lead_candidates enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage lead candidates" on public.lead_candidates;
create policy "authenticated can manage lead candidates" on public.lead_candidates
  for all to authenticated using (true) with check (true);

-- One row per research attempt (success or failure) — the source of truth for
-- spend. The monthly budget in src/lib/lead-candidate.ts is checked against
-- the sum of cost_usd here, so retries and failures are always counted.
create table if not exists public.lead_research_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  candidate_id uuid references public.lead_candidates(id) on delete set null,
  outcome text not null check (outcome in ('researched', 'failed', 'over_budget')),
  model text not null,
  cost_usd numeric(10, 4) not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  web_search_requests integer not null default 0,
  web_fetch_requests integer not null default 0,
  api_requests integer not null default 0,
  error text
);

create index if not exists lead_research_runs_created_at_idx on public.lead_research_runs (created_at);

alter table public.lead_research_runs enable row level security;

drop policy if exists "authenticated can manage lead research runs" on public.lead_research_runs;
create policy "authenticated can manage lead research runs" on public.lead_research_runs
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
