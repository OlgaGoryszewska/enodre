-- Replies found in your inboxes from people we messaged: Gmail for job
-- applications and recruiters, info@enodre.com for customers.
-- Idempotent — safe to run more than once. Run in the Supabase SQL Editor.

create table if not exists public.email_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mailbox text not null check (mailbox in ('gmail', 'info')),
  message_id text not null,
  from_email text not null,
  from_name text,
  subject text,
  received_at timestamptz not null,
  snippet text,
  is_auto boolean not null default false,
  kind text not null check (kind in ('lead', 'job')),
  lead_id uuid references public.potential_customers (id) on delete set null,
  contact_id uuid references public.career_contacts (id) on delete set null,
  company_key text,
  company text,
  unique (mailbox, message_id)
);
create index if not exists email_replies_received on public.email_replies (received_at desc);

alter table public.email_replies enable row level security;
drop policy if exists "Admins manage email replies" on public.email_replies;
create policy "Admins manage email replies" on public.email_replies
  for all to authenticated using (true) with check (true);

-- You marked it yourself (Nov 2026): automatic or real. The checker's rules
-- never change it again.
alter table public.email_replies add column if not exists auto_set_by_hand boolean not null default false;

-- The Gulf is out of the job search (Nov 2026): its replies are removed, and
-- the checker no longer saves them.
delete from public.email_replies where from_email ~* '\.(ae|sa|qa|kw|bh|om)$';

-- The Gulf is out of the job search (Nov 2026): its replies are removed, and
-- the checker no longer saves them.
delete from public.email_replies where from_email ~* '\.(ae|sa|qa|kw|bh|om)$';
