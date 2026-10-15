-- Admin dashboard: outreach messages sent to potential customers, logged from
-- the Message composer on /admin/marketing. One row per message marked as sent,
-- so the follow-up can see exactly what was said and when.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- Requires potential_customers.sql to have been run first.

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.potential_customers(id) on delete cascade,
  -- keep in sync with MESSAGE_KIND_VALUES / MESSAGE_CHANNEL_VALUES in src/lib/outreach-templates.ts
  kind text not null check (kind in ('connection_note', 'first_message', 'email', 'follow_up', 'phone_opener')),
  channel text not null check (channel in ('linkedin', 'email', 'phone', 'contact_form')),
  language text not null check (language in ('no', 'en')),
  subject text,
  body text not null
);

create index if not exists lead_messages_lead_id_idx on public.lead_messages (lead_id, created_at desc);

alter table public.lead_messages enable row level security;

-- Single-admin, admin-only table — same reasoning as events.sql/tasks.sql.
drop policy if exists "authenticated can manage lead messages" on public.lead_messages;
create policy "authenticated can manage lead messages" on public.lead_messages
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
