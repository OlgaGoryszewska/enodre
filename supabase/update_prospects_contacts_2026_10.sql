-- One-off: fills missing website / phone / email on the first 10 GTM prospects.
-- Researched 14 Oct 2026 from Brønnøysundregistrene (registered contact
-- details) and the companies' own websites. Only company addresses — no
-- named personal emails (markedsføringsloven §15).
-- Only fills EMPTY fields (coalesce), so anything already typed in stays.
-- Safe to re-run. Run after seed_prospects_2026_10.sql.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

update public.potential_customers p
set
  website = coalesce(p.website, v.website),
  phone = coalesce(p.phone, v.phone),
  email = coalesce(p.email, v.email),
  updated_at = now()
from (
  values
    -- knapphusenergi.no: Bryne office (Stavanger region), where the route-planner ad was.
    -- HQ is Øvre Vats: 52 76 72 77, post@knapphus.no.
    ('962956491', $$Knapphus Energi AS$$, $$https://knapphusenergi.no$$, $$51 64 24 00$$, $$energi@knapphus.no$$),
    -- engens.oljesenter.no (shared site with Hernes and Beck Oljesenter); same phone/email in the register.
    ('915957463', $$Engens Oljesenter AS$$, $$https://engens.oljesenter.no$$, $$62 54 07 70$$, $$engen@oljesenter.no$$),
    -- Register: tlf 33 36 39 60, post@vestfold-trafo.no.
    ('976069285', $$Vestfold Trafo Energi AS$$, null, $$33 36 39 60$$, $$post@vestfold-trafo.no$$),
    -- Register: post@bpe.no, company mobile 988 94 505 (bpe.no didn't load on 14 Oct either).
    ('912628752', $$BP Entreprenør AS$$, null, $$988 94 505$$, $$post@bpe.no$$),
    -- Register: post@otwike.no.
    ('930705462', $$Oskar og Tormod Wike AS$$, null, null, $$post@otwike.no$$)
) as v(org_number, company, website, phone, email)
where p.org_number = v.org_number or lower(p.company) = lower(v.company);

-- The seeded notes said no generic email was found for these two — now there is.
update public.potential_customers
set notes = replace(
  notes,
  $$Contact via the Bryne office — no generic post@ found, so phone or LinkedIn.$$,
  $$Contact via the Bryne office: 51 64 24 00, energi@knapphus.no (HQ: 52 76 72 77, post@knapphus.no).$$
)
where org_number = '962956491' or lower(company) = lower($$Knapphus Energi AS$$);

update public.potential_customers
set notes = replace(
  notes,
  $$No contact found yet and no generic post@ — phone or LinkedIn.$$,
  $$Phone 62 54 07 70 or engen@oljesenter.no (Næringsparkvegen 22, Hamar).$$
)
where org_number = '915957463' or lower(company) = lower($$Engens Oljesenter AS$$);
