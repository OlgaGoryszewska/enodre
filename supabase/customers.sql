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
