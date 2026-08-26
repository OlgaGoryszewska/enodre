-- Lead-capture form submissions (ChallengeForm -> /api/challenge).
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  company text,
  email text not null,
  challenge text not null,
  success_looks_like text,
  -- keep in sync with URGENCY_VALUES in src/lib/challenge-schema.ts
  urgency text not null check (urgency in ('exploring','6-months','3-months','now')),
  anything_else text,
  status text not null default 'new' check (status in ('new','contacted','archived'))
);

alter table public.contacts enable row level security;

-- The public form submits anonymously and may only insert — never read or
-- modify existing rows.
create policy "anon can insert" on public.contacts
  for insert to anon with check (true);

-- Only the logged-in admin may read or update submissions.
create policy "authenticated can read" on public.contacts
  for select to authenticated using (true);

create policy "authenticated can update" on public.contacts
  for update to authenticated using (true);
