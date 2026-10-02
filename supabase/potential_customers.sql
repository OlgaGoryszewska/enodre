-- Admin dashboard: marketing leads (potential customers), deliberately kept
-- separate from the "customers" table used by the People page — a lead here
-- is a prospect being pursued, not yet a real client/contact relationship.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.potential_customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  company text,
  email text,
  phone text,
  source text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'interested', 'converted', 'not_interested')),
  notes text
);

alter table public.potential_customers enable row level security;

drop policy if exists "authenticated can manage potential customers" on public.potential_customers;
create policy "authenticated can manage potential customers" on public.potential_customers
  for all to authenticated using (true) with check (true);
