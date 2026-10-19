-- GTM command centre (19 Oct 2026): research queue states, follow-up dates,
-- pipeline stages, discovery calls, and a backfill for older lead records.
-- Safe to re-run — every statement is idempotent.
-- Run AFTER: potential_customers.sql, lead_candidates.sql, lead_messages.sql.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 1. Outreach log: the address an email went to (also in lead_messages.sql).
alter table public.lead_messages add column if not exists recipient text;

-- ---------------------------------------------------------------------------
-- 2. Leads: follow-up date, next action, and the stages the GTM plan measures.
-- fit_score was briefly a lead column; the fit now lives with the research.
alter table public.potential_customers drop column if exists fit_score;
alter table public.potential_customers add column if not exists next_follow_up_on date;
alter table public.potential_customers add column if not exists next_action text;

-- keep in sync with POTENTIAL_CUSTOMER_STATUS_VALUES in src/lib/potential-customer.ts
alter table public.potential_customers drop constraint if exists potential_customers_status_check;
alter table public.potential_customers add constraint potential_customers_status_check
  check (status in ('new', 'contacted', 'interested', 'call_booked', 'call_done', 'proposal_sent', 'converted', 'not_interested'));

-- Backfill: some leads were created before the dedicated fields existed and
-- keep their data only in notes ("Segment F · Org.nr … · Place · 70 employees",
-- "Opener fact: …", "Source: …"). Copy it into the fields where they're empty.
-- (?n) makes ^ match at every line start.
update public.potential_customers
set
  opener_fact = coalesce(opener_fact, nullif(trim(substring(notes from '(?n)^Opener fact:\s*([^\n]+)')), '')),
  opener_source = coalesce(opener_source, substring(notes from '(?n)^Source:\s*(https?://\S+)')),
  segment = coalesce(segment, substring(notes from '(?n)^Segment ([FABC]) ·')),
  org_number = coalesce(org_number, regexp_replace(substring(notes from '(?n)^Segment [FABC] · Org\.nr ([0-9 ]+) ·'), '\s', '', 'g')),
  employees = coalesce(employees, substring(notes from '(?n)^Segment [FABC] · .* · ([0-9]+) employees')::integer),
  location = coalesce(location, trim(substring(notes from '(?n)^Segment [FABC] · Org\.nr [0-9 ]+ · (.+) · [0-9]+ employees'))),
  updated_at = now()
where notes ~ '(?n)^(Opener fact:|Segment [FABC] · Org\.nr)'
  and (opener_fact is null or segment is null or org_number is null or employees is null or location is null);

-- Backfill: contacted, unanswered leads get the follow-up date they would
-- have had (5 days after first contact), unless a follow-up already went out.
update public.potential_customers p
set next_follow_up_on = p.first_contacted_on + 5
where p.next_follow_up_on is null
  and p.first_contacted_on is not null
  and not p.responded
  and p.status not in ('not_interested', 'converted')
  and not exists (select 1 from public.lead_messages m where m.lead_id = p.id and m.kind = 'follow_up');

-- ---------------------------------------------------------------------------
-- 3. Research queue: an explicit processing state, attempt count, error kind.
-- keep in sync with LEAD_CANDIDATE_STATUS_VALUES in src/lib/lead-candidate.ts
alter table public.lead_candidates drop constraint if exists lead_candidates_status_check;
alter table public.lead_candidates add constraint lead_candidates_status_check
  check (status in ('found', 'processing', 'researched', 'failed', 'approved', 'rejected'));
alter table public.lead_candidates add column if not exists research_started_at timestamptz;
alter table public.lead_candidates add column if not exists attempts integer not null default 0;
alter table public.lead_candidates add column if not exists error_kind text;
alter table public.lead_candidates drop constraint if exists lead_candidates_error_kind_check;
alter table public.lead_candidates add constraint lead_candidates_error_kind_check
  check (error_kind in ('blocked', 'retryable', 'permanent'));

-- Older failures have no attempt count; count them as one attempt each.
update public.lead_candidates set attempts = 1 where status = 'failed' and attempts = 0;

-- ---------------------------------------------------------------------------
-- 4. Discovery calls: one row per call, linked to the lead. The customer's own
-- words go in the text fields; nothing here is AI-generated.
create table if not exists public.discovery_calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid not null references public.potential_customers(id) on delete cascade,
  -- keep in sync with src/lib/discovery-call.ts
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled')),
  scheduled_on date,
  completed_on date,
  problem_description text,
  current_workflow text,
  hours_per_week numeric(5, 1) check (hours_per_week >= 0),
  accounting_system text check (accounting_system in ('tripletex', 'fiken', 'poweroffice', 'visma', 'other')),
  systems text,
  problem_categories text[] not null default '{}' check (
    problem_categories <@ array['manual_transfer', 'incomplete_reports', 'manual_entry', 'invoice_delay', 'scattered_info', 'software_gap', 'other']::text[]
  ),
  main_bottleneck text,
  frequency text,
  business_impact text,
  decision_maker text,
  pilot_interest text not null default 'unknown' check (pilot_interest in ('unknown', 'no', 'maybe', 'yes')),
  next_action text,
  follow_up_on date,
  notes text
);

create index if not exists discovery_calls_lead_id_idx on public.discovery_calls (lead_id, created_at desc);

alter table public.discovery_calls enable row level security;

drop policy if exists "authenticated can manage discovery calls" on public.discovery_calls;
create policy "authenticated can manage discovery calls" on public.discovery_calls
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
