-- Stores OAuth tokens for third-party integrations (e.g. Upwork) so the
-- server can refresh them on the admin's behalf without re-authorizing.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table public.integration_tokens (
  provider text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.integration_tokens enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
create policy "authenticated can manage integration tokens" on public.integration_tokens
  for all to authenticated using (true) with check (true);
