-- One-off: adds the first 10 GTM prospects (researched 13–14 Oct 2026) to the
-- Leads pipeline (public.potential_customers). Org numbers, headcounts and
-- industry codes were checked against Brønnøysundregistrene on 14 Oct 2026.
-- The opener facts come from the linked sources — check each claim before
-- contacting anyone.
-- Run potential_customers.sql first (it adds the GTM columns used here).
-- Safe to re-run: companies already in the pipeline (same name) are skipped.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

insert into public.potential_customers (
  name, company, email, phone, source, status,
  segment, employees, location, org_number, website, best_channel,
  opener_fact, opener_source, notes
)
select
  v.name, v.company, v.email, v.phone, 'prospects-sheet', 'new',
  v.segment, v.employees, v.location, v.org_number, v.website, v.best_channel,
  v.opener_fact, v.opener_source, v.notes
from (
  values
    (
      $$Johannes & Jarle Sjurseike$$, $$Knapphus Energi AS$$, $$energi@knapphus.no$$, $$51 64 24 00$$,
      'F', 70, $$Vindafjord$$, '962956491', $$https://knapphusenergi.no$$, 'phone',
      $$Started as a local fuel supplier in 1961 and now distributes nationally. In Feb 2026 they advertised for a route planner/order taker in Bryne (order-based route planning, daily contact with drivers).$$,
      $$https://www.finn.no/451932973$$,
      $$Start here. Contact via the Bryne office: 51 64 24 00, energi@knapphus.no (HQ: 52 76 72 77, post@knapphus.no).
Check first: at 70 staff and national, they may already have a routing/ERP system.$$
    ),
    (
      $$Ove Seberg$$, $$Engens Oljesenter AS$$, $$engen@oljesenter.no$$, $$62 54 07 70$$,
      'F', 16, $$Hamar (Furnes)$$, '915957463', $$https://engens.oljesenter.no$$, 'phone',
      $$Turned 50 in 2025. Supplies fuel, lubricants, tanks and equipment across Innlandet to farms, industry and the public sector; sister companies Hernes and Beck Oljesenter.$$,
      $$https://www.finn.no/407130218$$,
      $$Start here. Phone 62 54 07 70 or engen@oljesenter.no (Næringsparkvegen 22, Hamar).$$
    ),
    (
      $$Peder William Osmundsen$$, $$Vestfold Trafo Energi AS$$, $$post@vestfold-trafo.no$$, $$33 36 39 60$$,
      'F', 12, $$Sandefjord (Stokke)$$, '976069285', $$https://www.vestfold-trafo.no$$, 'contact_form',
      $$Working on transformers since 1947. Field service, emergency call-outs, transformer rental and transport — each job is a site visit that needs documenting.$$,
      $$https://www.vestfold-trafo.no$$,
      null
    ),
    (
      $$Thomas Andre Pedersen$$, $$BP Entreprenør AS$$, $$post@bpe.no$$, $$988 94 505$$,
      'A', 45, $$Trondheim$$, '912628752', $$https://www.bpe.no$$, 'linkedin',
      $$Does small maintenance jobs for private customers as well as larger projects. Their Jan 2026 job ad describes the company as "growing, with increasing workloads".$$,
      $$https://www.finn.no/445215578$$,
      $$Start here. bpe.no didn't load during research.$$
    ),
    (
      $$Hallgeir Augdal$$, $$Ottar Augdal AS$$, $$augdal@augdal.no$$, $$72 59 20 10$$,
      'A', 25, $$Trondheim (Heimdal)$$, '938524831', $$https://www.augdal.no$$, 'phone',
      $$Over 60 years in Trondheim; projects such as Metrobuss, schools and residential areas. Hiring machine operators.$$,
      $$https://www.augdal.no$$,
      $$Check first: listed work is mostly large projects — possibly a weaker fit.$$
    ),
    (
      $$Jan Idar Flått$$, $$Oskar og Tormod Wike AS$$, $$post@otwike.no$$, $$992 29 000$$,
      'A', 47, $$Tønsberg (Vear)$$, '930705462', $$https://www.otwike.no$$, 'phone',
      $$Varied work — groundwork, water and sewer, demolition and timber harvesting. Their own examples include a bridge for Asker kommune and garages for a homeowners' association.$$,
      $$https://www.otwike.no$$,
      null
    ),
    (
      $$Ingfrid Svendsen$$, $$Kaare Mortensen AS$$, $$vestfold@kaare-mortensen.as$$, $$33 13 49 50$$,
      'A', 49, $$Larvik$$, '956813301', $$https://www.kaaremortensenvestfold.no$$, 'phone',
      $$Water and sewer, pump stations and residential plots across Vestfold; customers include private individuals as well as public developers.$$,
      $$https://www.kaaremortensenvestfold.no$$,
      $$Check first: the "vestfold" domain suggests one office of a larger group — confirm who decides.$$
    ),
    (
      $$Eivind Aune$$, $$Aune Maskin AS$$, $$post@aune-maskin.no$$, $$416 29 216$$,
      'A', 24, $$Midtre Gauldal (Støren)$$, '997020332', $$https://aune-maskin.no$$, 'phone',
      $$Construction, transport and property development; manure and lime transport and winter roads on the Trondheim–Røros–Oppdal axis — many small jobs that each end in an invoice.$$,
      $$https://aune-maskin.no/$$,
      $$Start here.$$
    ),
    (
      $$Geir Laukelid$$, $$Tele Trans AS$$, $$post@teletrans.no$$, $$35 90 00 81$$,
      'A', 36, $$Porsgrunn$$, '987647736', $$https://www.teletrans.no$$, 'phone',
      $$Courier and express transport, distribution and special transport, available 24/7 all year.$$,
      $$https://www.teletrans.no$$,
      null
    ),
    (
      $$Sture Dybvad$$, $$Sutra Dybvad AS$$, $$booking@dybvad.no$$, $$95 160 160$$,
      'A', 29, $$Malvik (Hommelvik)$$, '988556033', $$https://www.dybvad.no$$, 'phone',
      $$Over 50 years in business; crane truck rental and wheel loader jobs.$$,
      $$https://www.dybvad.no$$,
      $$Check first: drivers already report on tablets — ask how those reports get to invoicing rather than assuming paper.$$
    )
) as v(
  name, company, email, phone,
  segment, employees, location, org_number, website, best_channel,
  opener_fact, opener_source, notes
)
where not exists (
  select 1 from public.potential_customers p where lower(p.company) = lower(v.company)
);
