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
  -- Separate from `status` on purpose: status is the overall lead stage,
  -- these are quick per-channel markers (did I message them? did I call
  -- them?) you can tick independently of where the lead stands overall.
  message_sent boolean not null default false,
  call_made boolean not null default false,
  -- Phase 2: once a contacted lead responds, they move (in the UI) from the
  -- Potential Customers table to the Contacted Customers With Response
  -- table, where `attitude` — not `status` — tracks how the conversation
  -- is going.
  responded boolean not null default false,
  attitude text check (attitude in ('positive', 'neutral', 'negative')),
  notes text
);

alter table public.potential_customers enable row level security;

drop policy if exists "authenticated can manage potential customers" on public.potential_customers;
create policy "authenticated can manage potential customers" on public.potential_customers
  for all to authenticated using (true) with check (true);

-- Migration for a table created before message_sent/call_made existed —
-- idempotent, no-ops if the table was just created fresh above with these
-- columns already present.
alter table public.potential_customers add column if not exists message_sent boolean not null default false;
alter table public.potential_customers add column if not exists call_made boolean not null default false;

-- Migration for a table created before responded/attitude existed —
-- idempotent, no-ops if the table was just created fresh above.
alter table public.potential_customers add column if not exists responded boolean not null default false;
alter table public.potential_customers add column if not exists attitude text;
alter table public.potential_customers drop constraint if exists potential_customers_attitude_check;
alter table public.potential_customers add constraint potential_customers_attitude_check
  check (attitude in ('positive', 'neutral', 'negative'));
