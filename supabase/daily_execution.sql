-- Daily Execution (19 Oct 2026): GTM execution tasks with history, daily
-- check-ins and reviews, weekly reviews, and planner settings.
-- Why a new table rather than extending an existing one: public.tasks drives
-- the personal dashboard kanban and the admin calendar, and
-- public.marketing_tasks is a 3-column kanban ordered by drag position.
-- Neither has priorities, deadlines, lead links or history, and adding the six
-- execution statuses would break their columns. gtm_tasks references leads by
-- id only — no lead data is copied.
-- Safe to re-run — every statement is idempotent.
-- Run AFTER potential_customers.sql. Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.gtm_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (length(title) between 1 and 300),
  description text,
  -- keep these value lists in sync with src/lib/execution-tasks.ts
  category text not null check (category in ('planning', 'research', 'outreach', 'linkedin', 'follow_up', 'sales_call', 'gtm_project', 'review')),
  priority text not null default 'normal' check (priority in ('critical', 'high', 'normal', 'low')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'blocked', 'deferred', 'missed', 'cancelled')),
  planned_date date,
  deadline date,
  block text,
  estimated_minutes integer check (estimated_minutes between 0 and 600),
  actual_minutes integer check (actual_minutes between 0 and 1440),
  started_at timestamptz,
  completed_at timestamptz,
  -- Time tracking: total of finished running stretches, plus when the current
  -- stretch began (null when the timer isn't running).
  tracked_seconds integer not null default 0 check (tracked_seconds >= 0),
  timer_started_at timestamptz,
  lead_id uuid references public.potential_customers(id) on delete set null,
  milestone text check (milestone in ('discovery', 'pilot_offers', 'first_pilot')),
  source text not null default 'user' check (source in ('roadmap', 'recurring', 'crm', 'user')),
  -- Stable id for generated tasks: generating the same day twice can never
  -- create a second copy (unique), and user changes are never overwritten.
  source_key text unique,
  notes text,
  recurrence text,
  status_reason text
);

create index if not exists gtm_tasks_planned_date_idx on public.gtm_tasks (planned_date, status);
create index if not exists gtm_tasks_lead_id_idx on public.gtm_tasks (lead_id);

-- Task history: every status change, reschedule and note.
create table if not exists public.gtm_task_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  task_id uuid not null references public.gtm_tasks(id) on delete cascade,
  kind text not null check (kind in ('created', 'status', 'rescheduled', 'deadline', 'priority', 'note', 'linked')),
  from_value text,
  to_value text,
  note text
);

create index if not exists gtm_task_events_task_id_idx on public.gtm_task_events (task_id, created_at);

-- One row per working day: the morning check-in and the end-of-day review.
create table if not exists public.daily_reviews (
  day date primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  objective text,
  top_tasks text[] not null default '{}',
  meetings text,
  morning_blockers text,
  checked_in_at timestamptz,
  completed_summary text,
  first_contacts integer check (first_contacts >= 0),
  follow_ups integer check (follow_ups >= 0),
  responses text,
  calls_booked integer check (calls_booked >= 0),
  calls_completed integer check (calls_completed >= 0),
  obstacles text,
  tomorrow_top text,
  submitted_at timestamptz
);

create table if not exists public.weekly_reviews (
  week_start date primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  what_worked text,
  what_didnt text,
  best_industry text,
  best_message text,
  change_next_week text,
  submitted_at timestamptz
);

-- Upgrades for a database that ran an earlier version of this file.
alter table public.gtm_tasks add column if not exists tracked_seconds integer not null default 0;
alter table public.gtm_tasks add column if not exists timer_started_at timestamptz;
-- At most one running timer: time is never counted twice.
create unique index if not exists gtm_tasks_one_running_timer on public.gtm_tasks ((true)) where timer_started_at is not null;
alter table public.daily_reviews add column if not exists calls_booked integer;
alter table public.daily_reviews add column if not exists calls_completed integer;
alter table public.daily_reviews drop column if exists calls;
alter table public.gtm_task_events drop constraint if exists gtm_task_events_kind_check;
alter table public.gtm_task_events add constraint gtm_task_events_kind_check
  check (kind in ('created', 'status', 'rescheduled', 'deadline', 'priority', 'note', 'linked'));

-- Single-row planner settings (working hours and block durations).
create table if not exists public.planner_settings (
  id integer primary key default 1 check (id = 1),
  updated_at timestamptz not null default now(),
  day_start time not null default '08:30',
  -- [{ "key": "research", "minutes": 90 }, …] — overrides of the default blocks.
  block_minutes jsonb not null default '{}'::jsonb
);

-- Single-admin, admin-only tables — same reasoning as events.sql/tasks.sql.
alter table public.gtm_tasks enable row level security;
alter table public.gtm_task_events enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.planner_settings enable row level security;

drop policy if exists "authenticated can manage gtm tasks" on public.gtm_tasks;
create policy "authenticated can manage gtm tasks" on public.gtm_tasks
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated can manage gtm task events" on public.gtm_task_events;
create policy "authenticated can manage gtm task events" on public.gtm_task_events
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated can manage daily reviews" on public.daily_reviews;
create policy "authenticated can manage daily reviews" on public.daily_reviews
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated can manage weekly reviews" on public.weekly_reviews;
create policy "authenticated can manage weekly reviews" on public.weekly_reviews
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated can manage planner settings" on public.planner_settings;
create policy "authenticated can manage planner settings" on public.planner_settings
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
