-- Admin dashboard: marketing kanban board (To do / In progress / Done).
-- Standalone table, deliberately not mixed with the personal tasks table —
-- no calendar integration needed here, just title/description/status/position.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.marketing_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  -- ordering within a column; re-sequenced on every drag, same approach as tasks.position.
  position integer not null default 0
);

alter table public.marketing_tasks enable row level security;

-- Single-admin, admin-only table — same reasoning as tasks.sql.
drop policy if exists "authenticated can manage marketing tasks" on public.marketing_tasks;
create policy "authenticated can manage marketing tasks" on public.marketing_tasks
  for all to authenticated using (true) with check (true);
