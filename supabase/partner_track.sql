-- Partner track: agencies and software houses (Norway, then Poland) that
-- sell development/UX work to their own clients and may need extra capacity.
-- Idempotent — safe to run more than once. Run in the Supabase SQL Editor.

-- New playbook: agency_partner. Keep in sync with INDUSTRY_VALUES in src/lib/industry-playbooks.ts.
alter table public.potential_customers drop constraint if exists potential_customers_industry_check;
alter table public.potential_customers add constraint potential_customers_industry_check
  check (industry in ('contractor', 'electrical_plumbing', 'equipment_rental', 'technical_service', 'logistics', 'fuel_energy', 'cleaning_facility', 'agency_partner', 'other'));

-- New segment: P = partner. Keep in sync with SEGMENT_VALUES in src/lib/potential-customer.ts.
alter table public.potential_customers drop constraint if exists potential_customers_segment_check;
alter table public.potential_customers add constraint potential_customers_segment_check
  check (segment in ('F', 'A', 'B', 'C', 'P'));

-- Country: Polish leads follow Poland's consent rules (no cold email or sales calls).
alter table public.potential_customers add column if not exists country text not null default 'NO';
alter table public.potential_customers drop constraint if exists potential_customers_country_check;
alter table public.potential_customers add constraint potential_customers_country_check
  check (country in ('NO', 'PL'));

-- Hiring signals: the job ads (arbeidsplassen.no) a candidate was found by.
alter table public.lead_candidates add column if not exists hiring_signal jsonb;
