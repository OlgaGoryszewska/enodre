-- Your own status and sticky note per company, on its page under Applying for
-- jobs. Keyed by the lower-cased company name, as companyKey in
-- src/lib/application-search.ts makes it.
-- Idempotent — safe to run more than once. Run in the Supabase SQL Editor.

create table if not exists public.company_tracking (
  key text primary key,
  company text not null,
  status text,
  note text not null default '',
  updated_at timestamptz not null default now()
);
-- Statuses — keep in sync with COMPANY_STATUS_VALUES in src/lib/application-search.ts.
alter table public.company_tracking drop constraint if exists company_tracking_status_check;
alter table public.company_tracking add constraint company_tracking_status_check
  check (status in ('waiting', 'contact_them', 'talking', 'interview', 'offer', 'declined', 'closed'));

-- Removed from the Companies table by hand (Nov 2026). Search still finds it.
alter table public.company_tracking add column if not exists hidden boolean not null default false;

alter table public.company_tracking enable row level security;
drop policy if exists "Admins manage company tracking" on public.company_tracking;
create policy "Admins manage company tracking" on public.company_tracking
  for all to authenticated using (true) with check (true);
