-- Admin dashboard: personal "books to read" tracker.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.books_to_read (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  author text,
  url text,
  is_read boolean not null default false,
  note text
);

alter table public.books_to_read enable row level security;

drop policy if exists "authenticated can manage books to read" on public.books_to_read;
create policy "authenticated can manage books to read" on public.books_to_read
  for all to authenticated using (true) with check (true);
