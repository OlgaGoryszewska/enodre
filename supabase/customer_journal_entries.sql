-- Admin dashboard: per-customer journal — a running, timestamped log of
-- entries about a customer over time (distinct from the single overwritable
-- "Notes" field on the customer record itself).
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- Run this AFTER customers.sql (customer_journal_entries.customer_id references customers).

create table if not exists public.customer_journal_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  content text not null
);

create index if not exists customer_journal_entries_customer_id_idx on public.customer_journal_entries (customer_id);

alter table public.customer_journal_entries enable row level security;

drop policy if exists "authenticated can manage customer journal entries" on public.customer_journal_entries;
create policy "authenticated can manage customer journal entries" on public.customer_journal_entries
  for all to authenticated using (true) with check (true);
