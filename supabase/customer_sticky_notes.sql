-- Admin dashboard: per-customer freeform sticky-note board (FigJam-style).
-- One board per customer — every row scoped by customer_id, no separate
-- "board" table needed since there's exactly one board per customer.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- Run this AFTER customers.sql (customer_sticky_notes.customer_id references customers).

create table if not exists public.customer_sticky_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  content text not null default '',
  color text not null default 'violet'
    check (color in ('violet', 'coral', 'sage', 'paper', 'yellow', 'pink', 'blue', 'green', 'orange')),
  font text not null default 'sans' check (font in ('sans', 'handwritten')),
  text_size text not null default 'body' check (text_size in ('header', 'subheader', 'body')),
  -- Pixel offsets relative to the board canvas's own top-left origin (not
  -- viewport, not percentage) — see StickyNotesBoard.tsx.
  pos_x integer not null default 40,
  pos_y integer not null default 40,
  width integer not null default 180,
  height integer not null default 180
);

create index if not exists customer_sticky_notes_customer_id_idx on public.customer_sticky_notes (customer_id);

alter table public.customer_sticky_notes enable row level security;

drop policy if exists "authenticated can manage customer sticky notes" on public.customer_sticky_notes;
create policy "authenticated can manage customer sticky notes" on public.customer_sticky_notes
  for all to authenticated using (true) with check (true);

-- Migration for a table created before the resize/font/expanded-color pass —
-- idempotent, no-ops if the table was just created fresh above with these
-- columns already present.
alter table public.customer_sticky_notes add column if not exists font text not null default 'sans';
alter table public.customer_sticky_notes add column if not exists width integer not null default 180;
alter table public.customer_sticky_notes add column if not exists height integer not null default 180;
alter table public.customer_sticky_notes add column if not exists text_size text not null default 'body';

alter table public.customer_sticky_notes drop constraint if exists customer_sticky_notes_font_check;
alter table public.customer_sticky_notes add constraint customer_sticky_notes_font_check
  check (font in ('sans', 'handwritten'));

alter table public.customer_sticky_notes drop constraint if exists customer_sticky_notes_text_size_check;
alter table public.customer_sticky_notes add constraint customer_sticky_notes_text_size_check
  check (text_size in ('header', 'subheader', 'body'));

alter table public.customer_sticky_notes drop constraint if exists customer_sticky_notes_color_check;
alter table public.customer_sticky_notes add constraint customer_sticky_notes_color_check
  check (color in ('violet', 'coral', 'sage', 'paper', 'yellow', 'pink', 'blue', 'green', 'orange'));
