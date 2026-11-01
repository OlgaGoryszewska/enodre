-- A report for every outreach run ("Run outreach" and "Send follow-ups"),
-- shown on the Marketing page. Idempotent — safe to run more than once.

create table if not exists public.outreach_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('all', 'follow_ups')),
  sent_new integer not null default 0,
  sent_follow_ups integer not null default 0,
  report text not null
);

alter table public.outreach_runs enable row level security;
drop policy if exists "Admins manage outreach runs" on public.outreach_runs;
create policy "Admins manage outreach runs" on public.outreach_runs
  for all to authenticated using (true) with check (true);
