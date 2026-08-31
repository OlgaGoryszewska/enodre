-- Admin dashboard: customer records (name, contact info, status, notes).
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'lead' check (status in ('lead', 'active', 'past')),
  notes text
);

alter table public.customers enable row level security;

-- Single-admin, admin-only table — same reasoning as ai_job_matches.sql/linkedin_jobs.sql.
drop policy if exists "authenticated can manage customers" on public.customers;
create policy "authenticated can manage customers" on public.customers
  for all to authenticated using (true) with check (true);

-- Migration for a table created before relationship-type roles were added —
-- idempotent, no-ops if the table was just created fresh above. A person can
-- carry more than one role at once (e.g. Client and Partner on the same
-- contract), hence an array rather than a single enum column like status.
alter table public.customers add column if not exists roles text[] not null default '{}';

alter table public.customers drop constraint if exists customers_roles_check;
alter table public.customers add constraint customers_roles_check
  check (roles <@ array['client', 'contractor', 'partner', 'mentor_advisor', 'collaborator', 'vendor']::text[]);
