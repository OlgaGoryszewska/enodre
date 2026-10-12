-- Public "Book a call" bookings (BookingCalendar -> /api/booking).
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- Requires events.sql to have been run first.
--
-- Each booking also creates a row in public.events, so it shows up on
-- /admin/calendar and blocks that slot. Any admin event (including ones you
-- add by hand) blocks the slots it overlaps. Deleting the event frees the slot.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  company text,
  note text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  event_id uuid references public.events(id) on delete set null,
  constraint bookings_end_after_start check (end_time > start_time)
);

alter table public.bookings enable row level security;

-- Only the logged-in admin reads bookings directly. The public site never
-- touches this table or public.events itself — it goes through the two
-- security-definer functions below, which expose only what booking needs.
drop policy if exists "authenticated can manage bookings" on public.bookings;
create policy "authenticated can manage bookings" on public.bookings
  for all to authenticated using (true) with check (true);

-- Busy intervals in a range — times only, no titles or descriptions.
create or replace function public.get_busy_times(range_start timestamptz, range_end timestamptz)
returns table (start_time timestamptz, end_time timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.start_time, e.end_time
  from public.events e
  where e.start_time < range_end and e.end_time > range_start;
$$;

-- Books one slot atomically. The anon key is public, so this re-checks the
-- slot rules itself rather than trusting the API route.
-- Keep these rules in sync with BOOKING_CONFIG in src/lib/booking.ts.
create or replace function public.book_call(
  p_full_name text,
  p_email text,
  p_company text,
  p_note text,
  p_start timestamptz,
  p_end timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_start timestamp := p_start at time zone 'Europe/Oslo';
  v_local_end timestamp := p_end at time zone 'Europe/Oslo';
  v_event_id uuid;
  v_booking_id uuid;
begin
  if length(coalesce(p_full_name, '')) not between 2 and 120
     or length(coalesce(p_email, '')) not between 3 and 254
     or position('@' in p_email) = 0
     or length(coalesce(p_company, '')) > 160
     or length(coalesce(p_note, '')) > 2000 then
    raise exception 'invalid_details';
  end if;

  if p_end - p_start <> interval '30 minutes'
     or p_start < now() + interval '12 hours'
     or p_start > now() + interval '22 days'
     or extract(isodow from v_local_start) > 5
     or v_local_start::time < time '07:00'
     or v_local_end::time > time '19:00'
     or extract(minute from v_local_start) not in (0, 30) then
    raise exception 'invalid_slot';
  end if;

  -- Serialize bookings so two visitors can't grab the same slot at once.
  perform pg_advisory_xact_lock(hashtext('public.book_call'));

  if exists (
    select 1 from public.events e
    where e.start_time < p_end and e.end_time > p_start
  ) then
    raise exception 'slot_taken';
  end if;

  insert into public.events (title, description, start_time, end_time, all_day)
  values (
    'Call: ' || p_full_name || coalesce(' (' || nullif(p_company, '') || ')', ''),
    concat_ws(E'\n', 'Email: ' || p_email, 'Company: ' || nullif(p_company, ''), nullif(p_note, '')),
    p_start,
    p_end,
    false
  )
  returning id into v_event_id;

  insert into public.bookings (full_name, email, company, note, start_time, end_time, event_id)
  values (p_full_name, p_email, nullif(p_company, ''), nullif(p_note, ''), p_start, p_end, v_event_id)
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

revoke all on function public.get_busy_times(timestamptz, timestamptz) from public;
revoke all on function public.book_call(text, text, text, text, timestamptz, timestamptz) from public;
grant execute on function public.get_busy_times(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.book_call(text, text, text, text, timestamptz, timestamptz) to anon, authenticated;

-- Make the new functions visible to the API right away.
notify pgrst, 'reload schema';
