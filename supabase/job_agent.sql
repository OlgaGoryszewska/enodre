-- Job agent: job ads it found and scored, open applications it sent, and a
-- report per daily run. Plus a private storage bucket for the CV.
-- Idempotent — safe to run more than once. Run in the Supabase SQL Editor.

create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null,
  external_id text not null,
  title text not null,
  company text,
  location text,
  city text,
  url text not null,
  snippet text,
  published_at timestamptz,
  score integer not null default 0,
  matched text[] not null default '{}',
  language text not null default 'en' check (language in ('no', 'en')),
  apply_email text,
  cover_letter text,
  status text not null default 'new' check (status in ('new', 'applied', 'dismissed', 'interview', 'rejected')),
  applied_at timestamptz,
  applied_via text check (applied_via in ('email', 'form', 'linkedin', 'other')),
  unique (source, external_id)
);
-- Sources — keep in sync with JobSource in src/lib/job-sources.ts.
alter table public.job_postings drop constraint if exists job_postings_source_check;
alter table public.job_postings add constraint job_postings_source_check
  check (source in ('nav', 'adzuna', 'jooble', 'himalayas', 'remotive', 'linkedin', 'finn'));
-- Target cities — keep in sync with TARGET_CITIES in src/lib/job-matching.ts.
alter table public.job_postings drop constraint if exists job_postings_city_check;
alter table public.job_postings add constraint job_postings_city_check
  check (city in ('Oslo', 'Warsaw', 'Colombo', 'Dubai', 'Riyadh', 'Spain', 'Remote'));
create index if not exists job_postings_status_score on public.job_postings (status, score desc);

create table if not exists public.open_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_number text not null unique,
  company text not null,
  email text,
  city text not null default 'Oslo',
  status text not null check (status in ('sent', 'no_email', 'failed')),
  error text
);

create table if not exists public.job_agent_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trigger text not null check (trigger in ('cron', 'manual')),
  stats jsonb not null default '{}',
  report text
);

alter table public.job_postings enable row level security;
alter table public.open_applications enable row level security;
alter table public.job_agent_runs enable row level security;

drop policy if exists "Admins manage job postings" on public.job_postings;
create policy "Admins manage job postings" on public.job_postings
  for all to authenticated using (true) with check (true);
drop policy if exists "Admins manage open applications" on public.open_applications;
create policy "Admins manage open applications" on public.open_applications
  for all to authenticated using (true) with check (true);
drop policy if exists "Admins read job agent runs" on public.job_agent_runs;
create policy "Admins read job agent runs" on public.job_agent_runs
  for all to authenticated using (true) with check (true);

-- Your standard answers for application forms (notice period, salary …),
-- shown with copy buttons on Find jobs.
create table if not exists public.job_profile (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.job_profile enable row level security;
drop policy if exists "Admins manage job profile" on public.job_profile;
create policy "Admins manage job profile" on public.job_profile
  for all to authenticated using (true) with check (true);

-- Private bucket for the CV (it has a phone number — never public).
insert into storage.buckets (id, name, public)
values ('private', 'private', false)
on conflict (id) do nothing;

drop policy if exists "Admins manage private files" on storage.objects;
create policy "Admins manage private files" on storage.objects
  for all to authenticated using (bucket_id = 'private') with check (bucket_id = 'private');
