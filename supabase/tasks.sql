-- Admin dashboard kanban board (To do / In progress / Done).
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- If you already created this table before start_date/end_date/repeat_daily
-- existed, don't re-run the create table block below (it'll error "already
-- exists") — just run the "already have the table?" block at the bottom.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  -- ordering within a column; re-sequenced on every drag, so plain integers
  -- (not fractional) are fine at this scale.
  position integer not null default 0,
  -- optional — only tasks with both dates set show up on the admin calendar.
  start_date date,
  end_date date,
  -- when true, the task shows as a separate entry on every day from
  -- start_date through end_date instead of one spanning bar.
  repeat_daily boolean not null default false,
  constraint tasks_end_after_start check (end_date is null or start_date is null or end_date >= start_date)
);

alter table public.tasks enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql: one
-- combined policy is correct since there's exactly one actor with full
-- rights over the whole table.
create policy "authenticated can manage tasks" on public.tasks
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Already have the table? Run just this block to add the new columns.
-- ---------------------------------------------------------------------
-- alter table public.tasks add column if not exists start_date date;
-- alter table public.tasks add column if not exists end_date date;
-- alter table public.tasks add column if not exists repeat_daily boolean not null default false;
-- alter table public.tasks add constraint tasks_end_after_start
--   check (end_date is null or start_date is null or end_date >= start_date);
