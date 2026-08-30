-- Admin dashboard: per-customer file/image attachments.
-- Private Storage bucket + object-level RLS + a metadata table, so the UI
-- lists/deletes via the table and never lists the bucket directly.
-- Safe to re-run — every statement is idempotent.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- Run this AFTER customers.sql (customer_files.customer_id references customers).

insert into storage.buckets (id, name, public)
values ('customer-files', 'customer-files', false)
on conflict (id) do nothing;

drop policy if exists "authenticated can manage customer files" on storage.objects;
create policy "authenticated can manage customer files" on storage.objects
  for all to authenticated
  using (bucket_id = 'customer-files')
  with check (bucket_id = 'customer-files');

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  note text
);

create index if not exists customer_files_customer_id_idx on public.customer_files (customer_id);

alter table public.customer_files enable row level security;

drop policy if exists "authenticated can manage customer files metadata" on public.customer_files;
create policy "authenticated can manage customer files metadata" on public.customer_files
  for all to authenticated using (true) with check (true);

-- Migration for a table created before the note field was added — idempotent.
alter table public.customer_files add column if not exists note text;
