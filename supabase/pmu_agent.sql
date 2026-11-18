-- PMU job agent: clinics, salons and agencies to contact for semi-permanent
-- makeup work, and your licence progress and details for the messages.
-- Seeded from reports/PMU artist job agent research.md (Nov 2026).
-- Idempotent — safe to run more than once. Run in the Supabase SQL Editor.

create table if not exists public.pmu_targets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('clinic', 'salon', 'studio', 'academy', 'agency')),
  name text not null,
  city text not null,
  country text not null,
  website text,
  instagram text,
  whatsapp text,
  email text,
  services text,
  -- 1–5: how well the pay is likely to compare, from what the research found.
  pay_score integer not null default 3 check (pay_score between 1 and 5),
  pay_note text,
  fit text not null default 'medium' check (fit in ('high', 'medium', 'low')),
  source_url text,
  notes text,
  status text not null default 'to_contact'
    check (status in ('to_contact', 'contacted', 'replied', 'interview', 'offer', 'declined', 'not_relevant')),
  last_contacted_on date,
  unique (name, city)
);

alter table public.pmu_targets enable row level security;
drop policy if exists "Admins manage PMU targets" on public.pmu_targets;
create policy "Admins manage PMU targets" on public.pmu_targets
  for all to authenticated using (true) with check (true);

-- Licence stages, portfolio links and other answers, one row per key.
create table if not exists public.pmu_profile (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.pmu_profile enable row level security;
drop policy if exists "Admins manage PMU profile" on public.pmu_profile;
create policy "Admins manage PMU profile" on public.pmu_profile
  for all to authenticated using (true) with check (true);

insert into public.pmu_targets
  (kind, name, city, country, website, instagram, whatsapp, email, services, pay_score, pay_note, fit, source_url, notes, status)
values
  -- Europe.
  ('studio', 'Style Studio Sverige', 'Gothenburg', 'Sweden', null, null, null, null,
   'Advertised a PMU artist and trainer (Jul 2026)', 4, 'Swedish salaried role with trainer duties', 'high',
   'https://www.framtid.se/yrke/sminkor-make-up-artist/lediga-jobb/style-studio-sverige-ab/vi-soker-en-pmu-artist-utbildare-till-style-studio-sverige-goteborg',
   'Scandinavian, so your Norwegian helps.', 'to_contact'),
  ('academy', 'Rox Beauty Academy', 'Kongsberg', 'Norway', null, null, null, null,
   'Advertised a dedicated PMU artist (Nov 2026, NAV)', 3, 'Norwegian pay; or rent a room at NOK 4,000–6,000 per treatment', 'medium',
   'https://arbeidsplassen.nav.no', null, 'to_contact'),
  -- Recruitment agencies.
  ('agency', 'SpaStaff', 'Remote', 'Worldwide', 'https://spastaff.com', null, null, null,
   'Spa and beauty job board with CV upload', 2, 'Mixed', 'medium', 'https://spastaff.com', null, 'to_contact')
on conflict (name, city) do nothing;

-- ---------------------------------------------------------------------------
-- The daily search (Nov 2026): places it finds, job ads, and a report per run.

alter table public.pmu_targets add column if not exists source text not null default 'research';
alter table public.pmu_targets add column if not exists discovered_at timestamptz;
alter table public.pmu_targets add column if not exists fresha_url text;
alter table public.pmu_targets add column if not exists reviews integer;
alter table public.pmu_targets add column if not exists team_size integer;
create unique index if not exists pmu_targets_fresha_url on public.pmu_targets (fresha_url) where fresha_url is not null;

create table if not exists public.pmu_postings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('nav', 'alert', 'careers')),
  external_id text not null,
  title text not null,
  company text,
  location text,
  url text not null,
  snippet text,
  score integer not null default 0,
  matched text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'applied', 'dismissed')),
  unique (source, external_id)
);
alter table public.pmu_postings enable row level security;
drop policy if exists "Admins manage PMU postings" on public.pmu_postings;
create policy "Admins manage PMU postings" on public.pmu_postings
  for all to authenticated using (true) with check (true);

create table if not exists public.pmu_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trigger text not null check (trigger in ('cron', 'manual')),
  stats jsonb not null default '{}',
  report text
);
alter table public.pmu_runs enable row level security;
drop policy if exists "Admins read PMU runs" on public.pmu_runs;
create policy "Admins read PMU runs" on public.pmu_runs
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Costa Blanca: Moraira, Jávea, Altea and Albir (Nov 2026). Top-class and
-- medical aesthetic clinics first. Most don't list PMU yet: pitch adding it.
-- L'Alfàs del Pi / Albir has one of Spain's largest Norwegian communities.

insert into public.pmu_targets
  (kind, name, city, country, website, instagram, whatsapp, email, services, pay_score, pay_note, fit, source_url, notes, status)
values
  -- Albir / L'Alfàs del Pi
  ('clinic', 'SHA Wellness Clinic', 'Albir', 'Spain', 'https://shawellness.com', null, null, null,
   'World-class medical wellness resort with an advanced aesthetics department (derma aesthetics, high-tech facial treatments)', 4,
   'The most prestigious clinic on the coast; international clients', 'high',
   'https://shawellness.com/en/sha-integrative-method/advanced-aesthetics/facial-and-body-high-tech-treatments//',
   'Pitch medical micropigmentation (areola, brows after hair loss) as an add-on to their aesthetics programmes.', 'to_contact'),
  ('clinic', 'Derma Clinic Spain', 'Albir', 'Spain', null, null, '+34674255579', null,
   'Private clinic: dermatology, medical and aesthetic surgery, cosmetology; Av. de l''Albir 161', 3,
   'Surgical and dermatology clinic: areola and scar work fits', 'high',
   'https://www.findhealthclinics.com/ES/L''Alf%C3%A0s-del-Pi/385688868247340/Derma-Clinic-Spain', null, 'to_contact'),
  ('clinic', 'Siloé Clinic Albir', 'Albir', 'Spain', null, null, null, null,
   'Regenerative and anti-ageing medicine, aesthetic medicine and laser (Dr. Mayorga); C/ W.A. Mozart 13', 3,
   'Medical; no PMU listed: pitch adding it', 'high',
   'https://www.multiestetica.com/centros/siloe-clinic-albir-medicina-regenerativa-y-antienvejecimiento', 'Phone 965 034 241.', 'to_contact'),
  ('clinic', 'Igea by Dra. Estefanía Sánchez de Gea', 'Albir', 'Spain', 'https://www.igea-med-estetica.com', null, '+34639061978', null,
   'Aesthetic medicine and rejuvenation; Av. de l''Albir 151', 3, 'Doctor-led; no PMU listed: pitch adding it', 'high',
   'https://www.igea-med-estetica.com/', null, 'to_contact'),
  ('clinic', 'CAME Albir', 'Albir', 'Spain', 'https://clinicascame.com/albir/', null, '+34635364677', null,
   'Aesthetic medicine chain: CoolSculpting, hair micrografts; Av. El Albir 151', 3,
   'Part of a clinic chain: SMP and brow restoration fit their hair work', 'high', 'https://clinicascame.com/albir/', 'Also 966 06 37 99.', 'to_contact'),
  ('clinic', 'Alta Armonía Centro Médico Estético', 'Albir', 'Spain', 'https://centroaltarmonia.com', null, null, null,
   'Medical aesthetic centre: Botox, Vanquish, Exilis; Av. de l''Albir 155', 3, 'Medical; no PMU listed: pitch adding it', 'medium',
   'https://centroaltarmonia.com/', null, 'to_contact'),
  ('clinic', 'VIP Clinic', 'Albir', 'Spain', 'https://vipclinic.es', null, null, null,
   'Aesthetic medicine, fillers, mesotherapy; Av. de l''Albir 155', 2, 'Listing about two years old: check it is open', 'medium',
   'https://vipclinic.es/', null, 'to_contact'),
  -- Jávea / Xàbia
  ('clinic', 'Medispa Jávea', 'Jávea', 'Spain', 'https://medispa.es/en', null, null, null,
   'Luxury aesthetic medicine clinic: Botox, fillers, medical peels, body sculpting; Av. Lepanto 3', 3,
   'Premium positioning; no PMU listed: pitch adding it', 'high', 'https://medispa.es/en', null, 'to_contact'),
  ('clinic', 'Imperial Clinic', 'Jávea', 'Spain', 'https://imperialclinic.es', null, null, null,
   'Aesthetic medicine with a medical diagnosis for every treatment; Av. de la Llibertat 36', 3,
   'Medical; no PMU listed: pitch adding it', 'high', 'https://imperialclinic.es/en/tratamientos/medicina-estetica-en-javea/', null, 'to_contact'),
  ('clinic', 'Clínica Dalia – Dra. Blanca Cristóbal', 'Jávea', 'Spain', 'https://www.drablancacristobal.com', null, null, null,
   'Aesthetic medicine with Endymed and 3DEEP RF; Ctra. Cabo la Nao Pla 130', 3, 'Doctor-led; no PMU listed', 'high',
   'https://www.drablancacristobal.com/clinica-medicina-estetica-javea-html/', null, 'to_contact'),
  ('clinic', 'Zen Smile Spa – Dr. Carolyn Carbasse', 'Jávea', 'Spain', 'https://www.spajavea.es', null, null, null,
   'British/European medispa: Botox, fillers, laser; C/ Jorge Luis Borges 8', 3, 'English-speaking international clientele', 'high',
   'https://www.spajavea.es/', null, 'to_contact'),
  ('clinic', 'Policlínica CUME', 'Jávea', 'Spain', null, null, null, null,
   'Dermatology, aesthetic medicine and plastic surgery (Dra. Freya Belló Lozano, Dr. Eladio Ayala Vicedo); Av. Amanecer 37', 3,
   'Plastic surgery: areola reconstruction fits', 'high', 'https://www.javea.com/policlinica-cume/', null, 'to_contact'),
  ('clinic', 'MoMa Estética Avanzada & Clínica Anti-edad', 'Jávea', 'Spain', null, null, null, null,
   'Aesthetic medicine and anti-ageing; Avda. de los Fueros 39', 2, 'Smaller centre', 'medium',
   'https://doctorideal.com/centros/moma-estetica-avanzada-y-clinica-anti-edad', null, 'to_contact'),
  -- Moraira / Benissa
  ('clinic', 'Clínica Miramar', 'Benissa (Moraira)', 'Spain', 'https://clinicamiramar.com', null, null, null,
   'Medical aesthetics and longevity: Endolift, HIFU, fillers, hair transplants, plasma pen (Dr. Fernando Ángel Testi)', 4,
   'The leading medical aesthetic clinic between Moraira, Jávea and Calpe; no PMU listed', 'high', 'https://clinicamiramar.com/la-clinica/',
   'Hair transplants make SMP and brow restoration an easy add-on.', 'to_contact'),
  ('studio', 'Mian Advanced Aesthetic', 'Moraira', 'Spain', 'https://mian.es', null, null, null,
   'Advanced aesthetics with radiofrequency; C/ Dr Calatayud 49', 2, 'Beauty-led; no PMU listed', 'medium', 'https://mian.es/', null, 'to_contact'),
  ('salon', 'Estética Marie France Bambú', 'Moraira', 'Spain', 'https://esteticamariefrancebambu.com', null, null, null,
   'Facial and body treatments with Indiba and HIFU; C/ Dr Calatayud 56', 2, 'Established beauty centre; no PMU listed', 'medium',
   'https://esteticamariefrancebambu.com/', null, 'to_contact'),
  ('clinic', 'Clínica Moraira', 'Moraira', 'Spain', 'https://clinicamoraira.com', null, null, null,
   'General medical clinic with dermatology', 2, 'Medical; website looks old: check', 'medium', 'https://clinicamoraira.com/', 'Phone 966 49 07 07.', 'to_contact'),
  -- Altea
  ('clinic', 'Palomares Clínica Médico Estética', 'Altea', 'Spain', 'https://palomaresmedicoestetica.es', null, '+34651566555', null,
   'Aesthetic medicine, dermo-aesthetics and plastic surgery (liposuction, breast surgery); C/ Constitución 5', 3,
   'Surgery in-house: areola reconstruction fits', 'high', 'https://palomaresmedicoestetica.es/centro-medicina-estetica-altea/', null, 'to_contact'),
  ('clinic', 'Clínica Arzúa Alonso', 'Altea', 'Spain', 'https://clinicaarzuaalonso.com', null, '+34606350786', null,
   'Internal and aesthetic medicine; C/ A Llargues 3', 2, 'Doctor-led; no PMU listed', 'medium', 'https://clinicaarzuaalonso.com/', null, 'to_contact'),
  ('clinic', 'Dra. Rosana Villalba – Medicina Estética', 'Altea', 'Spain', null, null, '+34604419601', null,
   'Aesthetic medicine; C/ Conde de Altea 58', 2, 'Doctor-led; services not listed', 'medium',
   'https://www.paginasamarillas.es/f/altea/clinica-medicina-estetica-dra-rosana-villalba_231476086_000000002.html', null, 'to_contact'),
  ('salon', 'Beatriz Beauty Center (Hotel Cap Negret)', 'Altea', 'Spain', null, null, null, null,
   'Beauty centre inside Hotel Cap Negret; already offers eye and lip micropigmentation (4.9 from 99 reviews)', 3,
   'Already sells PMU in a hotel: may want a senior artist', 'high', 'https://booksy.com/es-es/s/micropigmentacion/56101_nucleo-l-albir', null, 'to_contact'),
  ('studio', 'Manukyan Beauty', 'Altea', 'Spain', null, null, null, null,
   'PMU studio: hair-stroke brows €230, eyeliner €200 (5.0 from 115 reviews); C/ Garganes 3', 2,
   'Busy PMU studio: possible chair or collaboration', 'medium', 'https://booksy.com/es-es/s/micropigmentacion/56101_nucleo-l-albir', null, 'to_contact')
on conflict (name, city) do nothing;

-- ---------------------------------------------------------------------------
-- Costa Blanca outreach so far (13 Nov 2026). Emails were sent from Gmail with
-- the portfolio attached; WhatsApp and forms are for Olga to send by hand.
-- Only places still "To contact" change, so later progress is never undone.

update public.pmu_targets set email = v.email,
  whatsapp = coalesce(v.whatsapp, public.pmu_targets.whatsapp),
  status = case when public.pmu_targets.status = 'to_contact' and v.sent then 'contacted' else public.pmu_targets.status end,
  last_contacted_on = case when v.sent then coalesce(public.pmu_targets.last_contacted_on, date '2026-11-13') else public.pmu_targets.last_contacted_on end,
  notes = concat_ws(' ', public.pmu_targets.notes, v.note),
  updated_at = now()
from (values
  ('CAME Albir', 'Albir', 'clinicacamealbir@gmail.com', '+34635364677', true, 'Email + portfolio sent 13 Nov 2026 (to the manager, María Isabel Martínez González). WhatsApp ready to send.'),
  ('Igea by Dra. Estefanía Sánchez de Gea', 'Albir', 'estefania.sanchez2222@gmail.com', '+34639061978', true, 'Email + portfolio sent 13 Nov 2026 to Dra. Sánchez de Gea (also head of aesthetic medicine at CAME). WhatsApp ready to send.'),
  ('SHA Wellness Clinic', 'Albir', 'careers@shawellnessclinic.com', null, true, 'Email sent 13 Nov 2026 with PMU portfolio and UX/dev CV; asked about El Albir and the Guest Journey Designer role at SHA Mexico.'),
  ('Clínica Miramar', 'Benissa (Moraira)', 'info@clinicamiramar.com', '+34644886113', true, 'Email + portfolio sent 13 Nov 2026.'),
  ('Clínica Dalia – Dra. Blanca Cristóbal', 'Jávea', 'info@drablancacristobal.com', '+34655707340', true, 'Email + portfolio sent 13 Nov 2026.'),
  ('Palomares Clínica Médico Estética', 'Altea', 'palbetcentromedico@gmail.com', '+34651566555', true, 'Email + portfolio sent 13 Nov 2026 (areola angle: they do breast surgery).'),
  ('Imperial Clinic', 'Jávea', 'info@imperialclinic.es', null, true, 'Email + portfolio sent 13 Nov 2026.'),
  ('Alta Armonía Centro Médico Estético', 'Albir', 'info@altaarmonia.com', '+34620294409', true, 'Email + portfolio sent 13 Nov 2026.'),
  ('Mian Advanced Aesthetic', 'Moraira', 'hola@mian.es', '+34615141405', true, 'Email + portfolio sent 13 Nov 2026.'),
  ('Medispa Jávea', 'Jávea', null, null, false, 'Email and WhatsApp drafted for Olga to send by hand (contact details on Google Maps).'),
  ('Zen Smile Spa – Dr. Carolyn Carbasse', 'Jávea', null, '+34665506009', false, 'WhatsApp and email drafted for Olga to send by hand.'),
  ('Estética Marie France Bambú', 'Moraira', null, '+34633901427', false, 'WhatsApp drafted for Olga to send by hand.'),
  ('Derma Clinic Spain', 'Albir', null, '+34674255579', false, 'Website blocks automated visits. WhatsApp and email (with IT skills) drafted for Olga to send by hand.')
) as v(name, city, email, whatsapp, sent, note)
where public.pmu_targets.name = v.name and public.pmu_targets.city = v.city
  and (public.pmu_targets.notes is null or position(v.note in public.pmu_targets.notes) = 0);

-- ---------------------------------------------------------------------------
-- Step-by-step tracking (Nov 2026): more stages, a history log per place,
-- your own next step, and the details of each offer.

alter table public.pmu_targets drop constraint if exists pmu_targets_status_check;
alter table public.pmu_targets add constraint pmu_targets_status_check
  check (status in ('to_contact', 'contacted', 'followed_up', 'replied', 'interview', 'trial', 'offer',
                    'accepted', 'not_now', 'declined', 'not_relevant'));
alter table public.pmu_targets add column if not exists next_action text;
alter table public.pmu_targets add column if not exists next_action_on date;
alter table public.pmu_targets add column if not exists offer jsonb;

create table if not exists public.pmu_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  target_id uuid not null references public.pmu_targets (id) on delete cascade,
  kind text not null check (kind in ('email_sent', 'whatsapp_sent', 'form_sent', 'instagram_sent', 'called', 'replied',
                                     'call_booked', 'visit', 'offer', 'declined', 'not_now', 'note')),
  at timestamptz not null default now(),
  note text,
  -- A reply found in Gmail, logged once.
  email_reply_id uuid unique
);
create index if not exists pmu_activity_target on public.pmu_activity (target_id, at);
alter table public.pmu_activity enable row level security;
drop policy if exists "Admins manage PMU activity" on public.pmu_activity;
create policy "Admins manage PMU activity" on public.pmu_activity
  for all to authenticated using (true) with check (true);

-- The emails sent on 13 Nov, in each place's history (once).
insert into public.pmu_activity (target_id, kind, at, note)
select t.id, 'email_sent', timestamptz '2026-11-13 18:00:00+01', v.note
from (values
  ('CAME Albir', 'Albir', 'To clinicacamealbir@gmail.com, with portfolio'),
  ('Igea by Dra. Estefanía Sánchez de Gea', 'Albir', 'To estefania.sanchez2222@gmail.com, with portfolio'),
  ('SHA Wellness Clinic', 'Albir', 'To careers@shawellnessclinic.com, with portfolio and UX/dev CV'),
  ('Clínica Miramar', 'Benissa (Moraira)', 'To info@clinicamiramar.com, with portfolio'),
  ('Clínica Dalia – Dra. Blanca Cristóbal', 'Jávea', 'To info@drablancacristobal.com, with portfolio'),
  ('Palomares Clínica Médico Estética', 'Altea', 'To palbetcentromedico@gmail.com, with portfolio'),
  ('Imperial Clinic', 'Jávea', 'To info@imperialclinic.es, with portfolio'),
  ('Alta Armonía Centro Médico Estético', 'Albir', 'To info@altaarmonia.com, with portfolio'),
  ('Mian Advanced Aesthetic', 'Moraira', 'To hola@mian.es, with portfolio')
) as v(name, city, note)
join public.pmu_targets t on t.name = v.name and t.city = v.city
where not exists (select 1 from public.pmu_activity a where a.target_id = t.id and a.kind = 'email_sent');

-- ---------------------------------------------------------------------------
-- Spain and Portugal only (14 Nov 2026): the Gulf places and Gulf recruiters
-- are removed, including any the daily search had found, with their history.

delete from public.pmu_targets
where country in ('UAE', 'Saudi Arabia', 'Qatar', 'GCC') or (name = 'Spa Elite' and city = 'London');
delete from public.pmu_postings
where location ilike any (array['%Riyadh%', '%Dubai%', '%Doha%', '%Jeddah%', '%Abu Dhabi%', '%GCC%']);

-- More of Spain and Portugal: premium and medical clinics on the coasts with
-- Scandinavian and British clients, and the medical cities.
insert into public.pmu_targets
  (kind, name, city, country, website, instagram, whatsapp, email, services, pay_score, pay_note, fit, source_url, notes, status)
values
  -- Marbella / Costa del Sol
  ('clinic', 'Arques Clinic Marbella', 'Marbella', 'Spain', 'https://arquesclinic.com/en/', null, null, null,
   'Non-surgical aesthetic medicine in Puerto Banús, 25+ years', 3, 'Top-ranked clinic in Marbella; no PMU listed: pitch adding it', 'high',
   'https://arquesclinic.com/en/', null, 'to_contact'),
  ('clinic', 'Elegant Clinic Banús', 'Marbella', 'Spain', 'https://elegantclinicbanus.com/en/', null, null, null,
   'Fillers, thread lifts, Hydrafacial, Thermage FLX', 3, 'Premium Puerto Banús clinic', 'high', 'https://elegantclinicbanus.com/en/treatments/', null, 'to_contact'),
  ('clinic', 'Clínica Dr. Campos', 'Marbella', 'Spain', null, null, null, null,
   'Plastic surgery; staff speak Spanish, English, French and Russian', 3, 'Plastic surgery: areola reconstruction fits', 'high',
   'https://www.whatclinic.com/beauty-clinics/spain/marbella/permanent-makeup', null, 'to_contact'),
  ('clinic', 'Vit&Drip Center Marbella', 'Marbella', 'Spain', 'https://www.vitdripcenter.com', null, null, null,
   'Health and aesthetic centre in Puerto Banús', 2, 'Wellness-led', 'medium', 'https://www.vitdripcenter.com/', null, 'to_contact'),
  ('clinic', 'Skin Medical & Aesthetic Clinic Marbella', 'Marbella', 'Spain', null, 'skinmedaestheticlinicmarbella', null, null,
   'Medical and aesthetic skin clinic', 2, 'Reach on Instagram', 'medium', 'https://www.instagram.com/skinmedaestheticlinicmarbella/', null, 'to_contact'),
  ('studio', '4D Pigmentación Studio', 'Marbella', 'Spain', null, null, null, null,
   'Hair, brow and reconstructive micropigmentation', 2, 'Specialist PMU studio: chair or collaboration', 'medium',
   'https://www.whatclinic.com/beauty-clinics/spain/marbella/permanent-makeup', null, 'to_contact'),
  ('academy', 'Tamara López Micropigmentación', 'Marbella', 'Spain', null, null, null, null,
   'Micropigmentation treatments and training courses', 2, 'Possible trainer role', 'medium', 'https://tressless.com/smp/tamara-lopez', null, 'to_contact'),
  ('clinic', 'NH Clínicas', 'Fuengirola', 'Spain', 'https://nhclinicas.com', null, null, null,
   'Multilingual medical clinic (English, Swedish, German …) with aesthetic medicine', 3,
   'Scandinavian clientele on the Costa del Sol', 'high', 'https://nhclinicas.com/', null, 'to_contact'),
  ('clinic', 'Clínica Médica Fuengirola', 'Fuengirola', 'Spain', 'https://clinicamedicafuengirola.com/en/home/', null, null, null,
   'Multidisciplinary medical centre with aesthetic medicine', 2, 'Medical; no PMU listed', 'medium',
   'https://clinicamedicafuengirola.com/en/home/', null, 'to_contact'),
  -- Mallorca
  ('clinic', 'Derma Clinic Palma', 'Palma de Mallorca', 'Spain', 'https://derma-clinic-palma.com/en/', null, null, null,
   'Classic and aesthetic dermatology, laser, fillers (Porto Pi), 25 years', 3, 'Dermatology: brow restoration and scar work fit', 'high',
   'https://derma-clinic-palma.com/en/', null, 'to_contact'),
  ('clinic', 'Planas Salud Medicina Estética', 'Palma de Mallorca', 'Spain', 'https://planassaludestetica.com/en/', null, null, null,
   'High-end aesthetic medicine with a dermatology unit', 3, 'Premium; no PMU listed: pitch adding it', 'high',
   'https://planassaludestetica.com/en/the-clinic/', null, 'to_contact'),
  ('clinic', 'Belau Medical Aesthetic Clinic', 'Palma de Mallorca', 'Spain', 'https://belau.es/en/', null, null, null,
   'Medical aesthetics, Dr. Belén Sánchez, central Palma', 3, 'Doctor-led; no PMU listed', 'high', 'https://belau.es/en/', null, 'to_contact'),
  ('clinic', 'Medical Oasis', 'Palma de Mallorca', 'Spain', 'https://www.medicaloasis.es/en/', null, null, null,
   'Aesthetic medicine clinic', 2, 'Medical', 'medium', 'https://www.medicaloasis.es/en/', null, 'to_contact'),
  ('clinic', 'Palma Clinic', 'Palma de Mallorca', 'Spain', null, null, null, null,
   'Medical clinic with aesthetic dermatology and premium wellness', 2, 'Medical', 'medium',
   'https://mallorca-map.com/en/services/palma-clinic-beauty-clinic', null, 'to_contact'),
  -- Algarve
  ('clinic', 'Family Medical Centre & Antiaging Clinic', 'Quinta do Lago (Algarve)', 'Portugal', 'https://family-medical-centre.pt', null, null, null,
   'Dermatology, aesthetic medicine and plastic surgery (Quinta do Lago, Vale do Lobo)', 3,
   'The most premium medical group in the Algarve; British and Scandinavian clients', 'high',
   'https://family-medical-centre.pt/aesthetic-medicine/', 'Plastic surgery: areola reconstruction fits.', 'to_contact'),
  ('clinic', 'Timeless Beauty Algarve', 'Vilamoura', 'Portugal', 'https://www.timelessbeautyalgarve.com', null, null, null,
   'Laser, IV therapy and aesthetic medicine (4.9 from 106 reviews)', 2, 'No PMU listed', 'medium', 'https://www.timelessbeautyalgarve.com/', null, 'to_contact'),
  ('clinic', 'Amillion Aesthetic Medical Clinic', 'Vilamoura', 'Portugal', null, null, null, null,
   'Medical aesthetics: pigmentation, HIFU, IPL', 2, 'Small clinic', 'medium',
   'https://www.fresha.com/a/amillion-algarve-aesthetic-medical-clinic-vilamoura-urbanizacao-encostas-das-oliveiras-44-b-d3tvhqjf', null, 'to_contact'),
  ('clinic', 'Up Clinic', 'Lisbon / Algarve', 'Portugal', 'https://upclinic.pt', null, null, null,
   'Aesthetic clinic in Lisbon, the Algarve (Vilamoura, Alvor) and the Azores', 2, 'Several locations', 'medium',
   'https://upclinic.pt/about-us/aesthetic-clinic/?lang=en', null, 'to_contact'),
  -- Lisbon and Porto
  ('clinic', 'MyMoment', 'Lisbon', 'Portugal', 'https://mymoment.pt', null, null, null,
   'Plastic surgery clinic that already offers paramedical micropigmentation, with dermatology and trichology', 3,
   'Already sells medical PMU: needs a senior artist', 'high', 'https://mymoment.pt/micropigmentacao-paramedica/', null, 'to_contact'),
  ('clinic', 'CLINIQ', 'Lisbon / Porto', 'Portugal', 'https://www.cliniq.pt', null, null, null,
   'Aesthetic medicine centres in Porto and Lisbon, including micropigmentation', 3, 'Two cities; already offers PMU', 'high',
   'https://www.cliniq.pt/', null, 'to_contact'),
  ('clinic', 'Personal Derma', 'Lisbon', 'Portugal', 'https://personalderma.pt', null, null, null,
   'Medical and aesthetic dermatology', 3, 'Dermatology: brow restoration and scar work fit', 'high', 'https://personalderma.pt/', null, 'to_contact'),
  ('studio', 'Clínica do Pigmento', 'Lisbon', 'Portugal', 'https://www.clinicadopigmento.pt', null, null, null,
   'Specialist micropigmentation clinic: scalp, brows, lips, stretch marks, removal', 3, 'Specialist PMU clinic: senior or trainer role', 'high',
   'https://www.clinicadopigmento.pt/contactos/clinica-do-pigmento-lisboa', null, 'to_contact'),
  ('clinic', 'Clínica Improve', 'Lisbon', 'Portugal', 'https://www.clinicaimprove.com', null, null, null,
   'Face and body treatments', 2, 'No PMU listed', 'medium', 'https://www.clinicaimprove.com/', null, 'to_contact')
on conflict (name, city) do nothing;

-- ---------------------------------------------------------------------------
-- Removed from the list by you (14 Nov 2026). Hidden rather than deleted, so
-- running this file again never brings a removed place back.
alter table public.pmu_targets add column if not exists hidden boolean not null default false;

-- The Dubai (DHA) licence tracker is gone with the Gulf: drop its saved dates.
delete from public.pmu_profile where key like 'licence\_%';

-- Your favourites (Nov 2026): shown first, in the green section.
alter table public.pmu_targets add column if not exists favourite boolean not null default false;

-- ---------------------------------------------------------------------------
-- Spain and Portugal outreach (14 Nov 2026): tailored emails with the portfolio
-- sent from Gmail. Only places still "To contact" change; each email is logged
-- once in the place's history.

update public.pmu_targets set email = coalesce(public.pmu_targets.email, v.email),
  status = case when public.pmu_targets.status = 'to_contact' then 'contacted' else public.pmu_targets.status end,
  last_contacted_on = coalesce(public.pmu_targets.last_contacted_on, date '2026-11-14'),
  updated_at = now()
from (values
  ('Clínica Moraira', 'Moraira', 'info@clinicamoraira.com'),
  ('Policlínica CUME', 'Jávea', 'esteticacume@gmail.com'),
  ('Arques Clinic Marbella', 'Marbella', 'info@arquesclinic.com'),
  ('Elegant Clinic Banús', 'Marbella', 'info@elegantclinicbanus.com'),
  ('Vit&Drip Center Marbella', 'Marbella', 'info@vitdripcenter.com'),
  ('NH Clínicas', 'Fuengirola', 'info@nhclinicas.com'),
  ('Planas Salud Medicina Estética', 'Palma de Mallorca', 'info@planassaludestetica.com'),
  ('Medical Oasis', 'Palma de Mallorca', 'info@medicaloasis.es'),
  ('Derma Clinic Palma', 'Palma de Mallorca', 'mallorcaderma@gmx.net'),
  ('Belau Medical Aesthetic Clinic', 'Palma de Mallorca', 'info@belau.es'),
  ('Family Medical Centre & Antiaging Clinic', 'Quinta do Lago (Algarve)', 'info@family-medical-centre.pt'),
  ('Timeless Beauty Algarve', 'Vilamoura', 'reception@timelessbeautyalgarve.com'),
  ('MyMoment', 'Lisbon', 'info@mymoment.pt'),
  ('CLINIQ', 'Lisbon / Porto', 'geral@cliniq.pt'),
  ('Personal Derma', 'Lisbon', 'geral@personalderma.pt'),
  ('Clínica do Pigmento', 'Lisbon', 'geral.lisboa@clinicadopigmento.pt'),
  ('Style Studio Sverige', 'Gothenburg', 'info@stylestudio.nu')
) as v(name, city, email)
where public.pmu_targets.name = v.name and public.pmu_targets.city = v.city
  and not exists (select 1 from public.pmu_activity a where a.target_id = public.pmu_targets.id and a.kind = 'email_sent');

insert into public.pmu_activity (target_id, kind, at, note)
select t.id, 'email_sent', timestamptz '2026-11-14 12:00:00+01', 'To ' || t.email || ', with portfolio'
from public.pmu_targets t
where (t.name, t.city) in (
  ('Clínica Moraira', 'Moraira'), ('Policlínica CUME', 'Jávea'), ('Arques Clinic Marbella', 'Marbella'),
  ('Elegant Clinic Banús', 'Marbella'), ('Vit&Drip Center Marbella', 'Marbella'), ('NH Clínicas', 'Fuengirola'),
  ('Planas Salud Medicina Estética', 'Palma de Mallorca'), ('Medical Oasis', 'Palma de Mallorca'),
  ('Derma Clinic Palma', 'Palma de Mallorca'), ('Belau Medical Aesthetic Clinic', 'Palma de Mallorca'),
  ('Family Medical Centre & Antiaging Clinic', 'Quinta do Lago (Algarve)'), ('Timeless Beauty Algarve', 'Vilamoura'),
  ('MyMoment', 'Lisbon'), ('CLINIQ', 'Lisbon / Porto'), ('Personal Derma', 'Lisbon'),
  ('Clínica do Pigmento', 'Lisbon'), ('Style Studio Sverige', 'Gothenburg'))
  and not exists (select 1 from public.pmu_activity a where a.target_id = t.id and a.kind = 'email_sent');

-- WhatsApp numbers found on the clinics' own websites (16 Nov 2026): their
-- WhatsApp links, or a mobile number where there was none. Never overwrites
-- a number you saved yourself.
update public.pmu_targets set whatsapp = v.whatsapp, updated_at = now()
from (values
  ('Timeless Beauty Algarve', 'Vilamoura', '+351910884695'),
  ('Vit&Drip Center Marbella', 'Marbella', '+34619228412'),
  ('Medical Oasis', 'Palma de Mallorca', '+34609274198'),
  ('Clínica do Pigmento', 'Lisbon', '+351910525759'),
  ('MyMoment', 'Lisbon', '+351938949463'),
  ('CLINIQ', 'Lisbon / Porto', '+351968799815'),
  ('Arques Clinic Marbella', 'Marbella', '+34662388888'),
  ('Up Clinic', 'Lisbon / Algarve', '+351961676599'),
  ('Elegant Clinic Banús', 'Marbella', '+34682175150'),
  ('Imperial Clinic', 'Jávea', '+34616267008'),
  ('Derma Clinic Palma', 'Palma de Mallorca', '+34627086092'),
  ('Personal Derma', 'Lisbon', '+351910333055'),
  ('Belau Medical Aesthetic Clinic', 'Palma de Mallorca', '+34692213500'),
  ('NH Clínicas', 'Fuengirola', '+34648913825'),
  ('Planas Salud Medicina Estética', 'Palma de Mallorca', '+34625031247'),
  ('Family Medical Centre & Antiaging Clinic', 'Quinta do Lago (Algarve)', '+351968482532')
) as v(name, city, whatsapp)
where public.pmu_targets.name = v.name and public.pmu_targets.city = v.city and public.pmu_targets.whatsapp is null;

-- Medical aesthetic clinics only (16 Nov 2026): studios, salons, academies and
-- recruiters are removed from the list. Hidden, not deleted, so their history
-- stays and "Show removed" brings one back.
update public.pmu_targets set hidden = true, updated_at = now()
where kind <> 'clinic' and not hidden;

-- More emails (17 Nov 2026): Up Clinic from here, and the one you sent Derma
-- Clinic Spain yourself on 13 Nov. Logged once; later progress is kept.
update public.pmu_targets set email = coalesce(public.pmu_targets.email, v.email),
  status = case when public.pmu_targets.status = 'to_contact' then 'contacted' else public.pmu_targets.status end,
  last_contacted_on = coalesce(public.pmu_targets.last_contacted_on, v.on_day),
  updated_at = now()
from (values
  ('Up Clinic', 'Lisbon / Algarve', 'info@upclinic.pt', date '2026-11-17'),
  ('Derma Clinic Spain', 'Albir', 'info@dermaclinicspain.com', date '2026-11-13')
) as v(name, city, email, on_day)
where public.pmu_targets.name = v.name and public.pmu_targets.city = v.city
  and not exists (select 1 from public.pmu_activity a where a.target_id = public.pmu_targets.id and a.kind = 'email_sent');

insert into public.pmu_activity (target_id, kind, at, note)
select t.id, 'email_sent', v.at, 'To ' || t.email || ', with portfolio'
from (values
  ('Up Clinic', 'Lisbon / Algarve', timestamptz '2026-11-17 12:00:00+01'),
  ('Derma Clinic Spain', 'Albir', timestamptz '2026-11-13 12:00:00+01')
) as v(name, city, at)
join public.pmu_targets t on t.name = v.name and t.city = v.city
where not exists (select 1 from public.pmu_activity a where a.target_id = t.id and a.kind = 'email_sent');

-- MoMa's mobile, from its Jávea listing (17 Nov 2026).
update public.pmu_targets set whatsapp = '+34636872302', updated_at = now()
where name = 'MoMa Estética Avanzada & Clínica Anti-edad' and city = 'Jávea' and whatsapp is null;

-- Clinics that already offer PMU or microblading (17 Nov 2026): they don't need
-- you, so they're removed from the list, including the daily search's finds
-- from before it looked for clinics without PMU. Hidden, not deleted.
update public.pmu_targets set hidden = true, updated_at = now()
where not hidden
  and (concat_ws(' ', name, services) ~* '(micropigment|microblad|permanent make|maquillaje permanente|maquilhagem permanente|dermopigment|lip blush|powder brow|combi brow|nano ?brow|microshad)'
       or pay_note ~* '(offers PMU without|premium PMU|already offers PMU)');

-- The daily search's finds (18 Nov 2026). mySkin emailed from here; Calma's
-- WhatsApp saved. Removed: places that already offer PMU (Centro Médico
-- Canillas, Bella Laser Clinic), a laser hair-removal chain (Dermasana), a
-- hair salon (MIJAS NATURAL), and NH Belleza, part of NH Clínicas (emailed 14 Nov).
update public.pmu_targets set email = coalesce(email, 'office@myskin-mallorca.com'),
  status = case when status = 'to_contact' then 'contacted' else status end,
  last_contacted_on = coalesce(last_contacted_on, date '2026-11-18'), updated_at = now()
where name ilike 'mySkin Dermatology%' and city = 'Palma de Mallorca'
  and not exists (select 1 from public.pmu_activity a where a.target_id = pmu_targets.id and a.kind = 'email_sent');

insert into public.pmu_activity (target_id, kind, at, note)
select t.id, 'email_sent', timestamptz '2026-11-18 12:00:00+01', 'To office@myskin-mallorca.com, with portfolio (corrections after laser removal, medical PMU)'
from public.pmu_targets t
where t.name ilike 'mySkin Dermatology%' and t.city = 'Palma de Mallorca'
  and not exists (select 1 from public.pmu_activity a where a.target_id = t.id and a.kind = 'email_sent');

update public.pmu_targets set whatsapp = '+351928053614', instagram = coalesce(instagram, 'calma.clinicacademy'), updated_at = now()
where name ilike 'Calma Clinic%' and whatsapp is null;

update public.pmu_targets set hidden = true, updated_at = now()
where not hidden and (name ilike 'Centro M_dico Canillas%' or name ilike 'Bella Laser Clinic%' or name ilike 'Dermasana%'
  or name ilike 'MIJAS NATURAL%' or name ilike 'NH Belleza%');

-- Costa Blanca clinics found on Google Maps (18 Nov 2026): premium medical
-- aesthetic clinics with no PMU on their websites. Six emailed from here with
-- the portfolio; three to reach on WhatsApp or by phone.
insert into public.pmu_targets
  (kind, name, city, country, website, whatsapp, email, services, pay_score, pay_note, fit, source, source_url, reviews, notes, status, last_contacted_on, discovered_at)
values
  ('clinic', 'SEA Clinic', 'Alicante', 'Spain', 'http://www.seaclinic.es/', '+34654499518', 'info@seaclinic.es', 'Plastic surgery and aesthetic medicine (Alicante and Murcia) (4.7★, 200 reviews on Google)', 5, 'Google 4.7★ from 200 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=7244983307893109802&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 200, 'Carrer Alemania, 6, 03003 Alacant, Alicante, España', 'contacted', '2026-11-18', now()),
  ('clinic', 'Dr Sergio Huerta – Medifach Calpe', 'Calpe', 'Spain', 'https://medifachcalpe.com/', '+34638734398', 'sergiohb93@gmail.com', 'Advanced facial aesthetic medicine, laser and anti-ageing (5★, 217 reviews on Google)', 5, 'Google 5.0★ from 217 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=16350951230718564877&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 217, 'C. Gibraltar, 8 Edificio Frentemar, Piso 1 puerta 7, 03710 Calpe, Alicante, España', 'contacted', '2026-11-18', now()),
  ('clinic', 'Dr Javier Casado – Medicina Estética', 'Calpe', 'Spain', 'https://drjaviercasado.es/', '+34601534372', 'doctorjaviercasado@gmail.com', 'Hair transplants and aesthetic medicine (also Clínica Naoos): SMP and brow restoration fit (5★, 191 reviews on Google)', 5, 'Google 5.0★ from 191 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=5614894421326360743&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 191, 'C. Delfín, 3, Loc 6A, 03710 Calpe, Alicante, España', 'contacted', '2026-11-18', now()),
  ('clinic', 'Clínica Estética Dra. Flores de Apodaca', 'Dénia', 'Spain', 'https://clinicafloresdeapodaca.com/', '+34663274378', 'info@clinicafloresdeapodaca.com', 'Doctor-led aesthetic medicine clinic (5★, 54 reviews on Google)', 4, 'Google 5.0★ from 54 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=17688588368405486963&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 54, 'C/ de Patricio Ferrándiz, 86, 03700 Dénia, Alicante, España', 'contacted', '2026-11-18', now()),
  ('clinic', 'Clínica Aura – Medicina Estética', 'Dénia', 'Spain', 'https://auradenia.com/', '+34696797424', 'auradeniaclinic@gmail.com', 'Aesthetic medicine clinic (4.9★, 65 reviews on Google)', 4, 'Google 4.9★ from 65 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=17930154181965390957&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 65, 'Carrer Vicent Andrés Estellés, 6, 03700 Dénia, Alicante, España', 'contacted', '2026-11-18', now()),
  ('clinic', 'Centro Médico-Estético Elena Heredia', 'Benidorm', 'Spain', 'http://centroelenaheredia.es/', '+34630535011', 'info@elenaheredia.com', 'Medical-aesthetic centre (4.8★, 224 reviews on Google)', 4, 'Google 4.8★ from 224 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=12097011436015843690&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 224, 'C. de Tomás Ortuño, 22, 2ºB, 03501 Benidorm, Alicante, España', 'contacted', '2026-11-18', now()),
  ('clinic', 'Senses by Yani – Centro Médico-Estético', 'Dénia', 'Spain', 'https://bit.ly/Reservar_Senses_by_Yani', '+34605054065', null, 'Medical-aesthetic centre (5★, 87 reviews on Google)', 4, 'Google 5.0★ from 87 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=9874227152494142357&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 87, 'Av Joan Fuster, 24B, bajo, 03700 Denia, Alicante, España', 'to_contact', null, now()),
  ('clinic', 'AnyLopez Clínica Estética', 'Benidorm', 'Spain', 'https://anylopez.com/', '+34656306167', null, 'Aesthetic clinic (5★, 250 reviews on Google)', 4, 'Google 5.0★ from 250 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13922023272971692364&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 250, 'C/ del Marqués de Comillas, 4, Loc 6, 03501 Benidorm, Alicante, España', 'to_contact', null, now()),
  ('clinic', 'DERMADENIA', 'Dénia', 'Spain', 'http://www.dermadenia.com/', null, null, 'Dermatology and aesthetic medicine (4.8★, 238 reviews on Google)', 5, 'Google 4.8★ from 238 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=9342632048785415110&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 238, 'Av. Miguel Hernández, 44, 03700 Denia, Alicante, España Phone +34 865 68 67 87.', 'to_contact', null, now())
on conflict (name, city) do nothing;

insert into public.pmu_activity (target_id, kind, at, note)
select t.id, 'email_sent', timestamptz '2026-11-18 12:00:00+01', v.note
from (values
  ('SEA Clinic', 'Alicante', 'To info@seaclinic.es, with portfolio'),
  ('Dr Sergio Huerta – Medifach Calpe', 'Calpe', 'To sergiohb93@gmail.com, with portfolio'),
  ('Dr Javier Casado – Medicina Estética', 'Calpe', 'To doctorjaviercasado@gmail.com, with portfolio'),
  ('Clínica Estética Dra. Flores de Apodaca', 'Dénia', 'To info@clinicafloresdeapodaca.com, with portfolio'),
  ('Clínica Aura – Medicina Estética', 'Dénia', 'To auradeniaclinic@gmail.com, with portfolio'),
  ('Centro Médico-Estético Elena Heredia', 'Benidorm', 'To info@elenaheredia.com, with portfolio')
) as v(name, city, note)
join public.pmu_targets t on t.name = v.name and t.city = v.city
where not exists (select 1 from public.pmu_activity a where a.target_id = t.id and a.kind = 'email_sent');

-- ---------------------------------------------------------------------------
-- Google Maps, the rest of Spain and Portugal (19 Nov 2026): premium medical
-- aesthetic clinics (4.5★+, 40+ reviews) with no PMU on their websites, in
-- Marbella, Mallorca, Madrid, Barcelona, Sitges, Valencia, Lisbon, Cascais and
-- Porto. 67 were emailed from here with the portfolio (logged below once sent).
insert into public.pmu_targets
  (kind, name, city, country, website, whatsapp, email, services, pay_score, pay_note, fit, source, source_url, reviews, notes, discovered_at)
values
  ('clinic', 'MED Medicina Estética', 'Marbella', 'Spain', 'http://www.delriomedestetica.com/', '+34636324835', 'yadiragerentemed@gmail.com', 'Medical aesthetic clinic on Google Maps (4.9★, 234 reviews)', 5, 'Google 4.9★ from 234 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=14633607664287967113&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 234, 'Av. Ramón y Cajal, 23, Edif Parquesol local 7, 29601 Marbella, Málaga, España', now()),
  ('clinic', 'Clinic New Aesthetic', 'Marbella', 'Spain', 'https://clinicnewaesthetic.com/', '+34680426143', 'clinicnewaesthetic@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 241 reviews)', 5, 'Google 5.0★ from 241 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=9998901238235163139&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 241, 'Calle Alhambra Urb, Aloha Pueblo, Local 27, Nueva Andalucía, 29660 Marbella, Málaga, España', now()),
  ('clinic', 'Dr Chantada Clinic', 'Marbella', 'Spain', 'https://drchantadaclinic.com/', '+34649025739', 'drchantadaclinic@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 220 reviews)', 5, 'Google 5.0★ from 220 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13194622719938590101&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 220, 'Edificio Romero de Torres, Urbanización Magna, Av Calderón de la Barca, 1º planta, Nueva Andalucía, 29660 Marbella, Málaga, España', now()),
  ('clinic', 'Hi Skin', 'Marbella', 'Spain', 'http://www.hiskin.es/', '+34627484576', 'info@hiskin.es', 'Medical aesthetic clinic on Google Maps (5★, 65 reviews)', 4, 'Google 5.0★ from 65 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13184378457030893253&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 65, 'Av. Ricardo Soriano, 56, Loc 5, 29601 Marbella, Málaga, España', now()),
  ('clinic', 'JM Clinic', 'Marbella', 'Spain', 'https://jmclinic.es/', '+34687002157', 'info@jmclinic.es', 'Medical aesthetic clinic on Google Maps (5★, 122 reviews)', 4, 'Google 5.0★ from 122 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=1129497765519291988&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 122, 'C. Adolfo Luque Chicote, 3, 29670 San Pedro Alcántara, Málaga, España', now()),
  ('clinic', 'Clínica March Marbella', 'Marbella', 'Spain', 'https://clinicamarch.com/', null, 'marbella@clinicamarch.com', 'Medical aesthetic clinic on Google Maps (4.8★, 193 reviews)', 5, 'Google 4.8★ from 193 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=808413402413252851&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 193, 'Av. Cánovas del Castillo, 6, 29601 Marbella, Málaga, España Phone +34 952 90 04 00.', now()),
  ('clinic', 'Clínica Dr. Agassi', 'Marbella', 'Spain', 'http://www.artistryclinic.es/', '+34636939768', 'info@doctoragassi.com', 'Medical aesthetic clinic on Google Maps (5★, 134 reviews)', 4, 'Google 5.0★ from 134 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=14421786690451156884&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 134, 'Centro Comercial Biarritz, Loc 3A, 29680 Estepona, Málaga, España', now()),
  ('clinic', 'Clínica Dr. Oulkadi', 'Marbella', 'Spain', 'https://medicinaesteticadroulkadi.com/', '+34692848244', 'contacto@medicinaesteticadroulkadi.com', 'Medical aesthetic clinic on Google Maps (4.9★, 88 reviews)', 4, 'Google 4.9★ from 88 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=780576723363797470&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 88, 'C. Jaén, 7, local 2, 29670 San Pedro Alcántara, Málaga, España', now()),
  ('clinic', 'Banús Aesthetics', 'Marbella', 'Spain', 'http://banusaesthetics.es/', '+34629083773', null, 'Medical aesthetic clinic on Google Maps (4.9★, 109 reviews)', 3, 'Google 4.9★ from 109 reviews; medical clinic on Google; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=17478580997806040464&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 109, 'Pl. de Antonio Banderas, 16, Nueva Andalucía, 29660 Marbella, Málaga, España', now()),
  ('clinic', 'Dra Virginia Benítez Roig Aesthetics', 'Marbella', 'Spain', 'http://www.dravbenitez.com/', '+34697195694', 'info@dravbenitez.com', 'Medical aesthetic clinic on Google Maps (4.5★, 44 reviews)', 4, 'Google 4.5★ from 44 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=15838236991024129218&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 44, 'N-340, Km. 175, Nueva Andalucía, 29660 Marbella, Málaga, España', now()),
  ('clinic', 'OGS Medical', 'Estepona', 'Spain', 'http://www.ogsmedical.com/', '+34680337255', null, 'Medical aesthetic clinic on Google Maps (4.5★, 106 reviews)', 4, 'Google 4.5★ from 106 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13593876769450716205&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 106, 'Edificio Parque Sol, Av. Juan Carlos I, 52, Loc 5, 29680 Estepona, Málaga, España', now()),
  ('clinic', 'Selvéa Clínica de Medicina Estética', 'Málaga', 'Spain', 'https://clinicaselvea.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp', '+34650593380', 'clinicaselvea@gmail.com', 'Medical aesthetic clinic on Google Maps (4.9★, 94 reviews)', 4, 'Google 4.9★ from 94 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=8652421137399387021&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 94, 'C. Palo Mayor, 4, Loc 5, Bailén-Miraflores, 29010 Málaga, España', now()),
  ('clinic', 'Rejuvelook', 'Fuengirola', 'Spain', 'https://rejuvelook.com/', '+34637395486', 'hola@rejuvelook.com', 'Medical aesthetic clinic on Google Maps (5★, 313 reviews)', 4, 'Google 5.0★ from 313 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=3034194331650273901&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 313, 'P.º Jesús Santos Rein, 7, 29640 Fuengirola, Málaga, España', now()),
  ('clinic', 'SUMA Medicina Estética', 'Fuengirola', 'Spain', 'https://clinicasuma.es/', '+34640614002', 'sandra.passarelli@gmail.com', 'Medical aesthetic clinic on Google Maps (4.9★, 45 reviews)', 3, 'Google 4.9★ from 45 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=6399279484484124781&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 45, 'esquina Sebastián Elcano, C. Asturias, 11, Loc 1, 29640 Fuengirola, Málaga, España', now()),
  ('clinic', 'MJ Estética Avanzada', 'Fuengirola', 'Spain', 'https://mjestheticadvanced.com/', '+34641016466', 'info@mjestheticadvanced.com', 'Medical aesthetic clinic on Google Maps (4.7★, 297 reviews)', 3, 'Google 4.7★ from 297 reviews; medical clinic on Google; top rated and busy; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=1410422332100604045&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 297, 'C. Molino De Viento, 5, Loc 2, 29640 Fuengirola, Málaga, España', now()),
  ('clinic', 'CM Clinic', 'Palma de Mallorca', 'Spain', 'http://www.cmclinicmallorca.com/', '+34625773385', 'info@cmclinic.es', 'Medical aesthetic clinic on Google Maps (5★, 255 reviews)', 5, 'Google 5.0★ from 255 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=16509782143424397383&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 255, 'Carrer Sant Llàtzer, 8, Llevant, 07005 Palma, Illes Balears, España', now()),
  ('clinic', 'Clínica Mesomedic', 'Palma de Mallorca', 'Spain', 'https://www.mesomedic.es/?utm_source=google&utm_medium=organic&utm_campaign=ficha-palma', null, 'info@mesomedic.es', 'Medical aesthetic clinic on Google Maps (4.9★, 368 reviews)', 5, 'Google 4.9★ from 368 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=16010328233947821386&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 368, 'Carrer del Bisbe Teodor Úbeda, 2, Ponent, 07014 Palma, Illes Balears, España Phone +34 971 90 57 77.', now()),
  ('clinic', 'Clínica Áureo', 'Palma de Mallorca', 'Spain', 'http://www.clinicaaureo.com/', null, 'info@clinicaaureo.com', 'Medical aesthetic clinic on Google Maps (4.9★, 404 reviews)', 5, 'Google 4.9★ from 404 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=6570668140849058086&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 404, 'Camí de la Vileta, 39, Planta 1 Local 1, Ponent, 07011 Palma, Illes Balears, España Phone +34 871 57 55 10.', now()),
  ('clinic', 'Ikonic Clinic', 'Palma de Mallorca', 'Spain', 'https://ikonicclinic.com/', '+34614360121', 'hola@ikonicclinic.com', 'Medical aesthetic clinic on Google Maps (5★, 267 reviews)', 5, 'Google 5.0★ from 267 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=17252668187562606517&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 267, 'Carrer d''Alfons el Magnànim, 55, Nord, 07004 Palma, Illes Balears, España', now()),
  ('clinic', 'Oliva Aesthetic & Hair Clinic', 'Palma de Mallorca', 'Spain', 'http://olivaclinics.com/', '+34689854999', 'recepcion@olivaclinics.com', 'Medical aesthetic clinic on Google Maps (5★, 376 reviews)', 5, 'Google 5.0★ from 376 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=8210269126105259277&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 376, 'Carrer de Sant Magí, 63, Ponent, 07013 Palma, Illes Balears, España', now()),
  ('clinic', 'Tabatha Clínica Estética y Medicina Integral', 'Palma de Mallorca', 'Spain', 'https://clinicatabatha.com/', '+34618677678', null, 'Medical aesthetic clinic on Google Maps (4.6★, 720 reviews)', 4, 'Google 4.6★ from 720 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=8752962181813379754&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 720, 'Carrer Hug de Ribesaltes, 1, entresuelo , centro, Centre, 07012 Palma, Illes Balears, España', now()),
  ('clinic', 'Mallorca Aesthetic Clinic', 'Palma de Mallorca', 'Spain', 'https://mac-clinica.com/', null, 'mallorcaaestheticclinic@gmail.com', 'Medical aesthetic clinic on Google Maps (4.8★, 158 reviews)', 5, 'Google 4.8★ from 158 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=18258326360878819295&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 158, 'Passeig des Born, 15, 1º B-C, Centre, 07012 Palma, Illes Balears, España Phone +34 971 76 37 87.', now()),
  ('clinic', 'Klinik Ventura', 'Palma de Mallorca', 'Spain', 'https://www.klinikventura.com/', '+34659666615', 'info@klinikventura.com', 'Medical aesthetic clinic on Google Maps (4.9★, 53 reviews)', 4, 'Google 4.9★ from 53 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=6538094961690555021&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 53, 'Carrer de la Riera, 5A, Bajos, Centre, 07003 Palma, Illes Balears, España', now()),
  ('clinic', 'Clínica One Face', 'Palma de Mallorca', 'Spain', 'http://www.oneface.es/', '+34623066437', 'info@oneface.es', 'Medical aesthetic clinic on Google Maps (4.9★, 133 reviews)', 4, 'Google 4.9★ from 133 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=12381939745762666620&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 133, 'Carrer del Rector Antoni Ferrer, 28, Nord, 07010 Palma, Illes Balears, España', now()),
  ('clinic', 'MMG Cirugía Plástica', 'Palma de Mallorca', 'Spain', 'https://mallorcamedicalgroup.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp', null, 'info@mallorcamedicalgroup.com', 'Medical aesthetic clinic on Google Maps (4.8★, 152 reviews)', 5, 'Google 4.8★ from 152 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=5695286219828844700&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 152, 'Camí de la Vileta, 46C, Ponent, 07011 Palma, Illes Balears, España Phone +34 971 25 46 86.', now()),
  ('clinic', 'Mara Aesthetics', 'Palma de Mallorca', 'Spain', 'https://www.mara-aesthetics-mallorca.com/es', null, 'clinica@mara-aesthetics.com', 'Medical aesthetic clinic on Google Maps (5★, 126 reviews)', 4, 'Google 5.0★ from 126 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=4971246321163952062&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 126, 'Via Roma, 6, entresuelo A, Centre, 07012 Palma, Illes Balears, España Phone +34 971 74 09 26.', now()),
  ('clinic', 'Elona Medicina Estética', 'Madrid', 'Spain', 'http://elonamedicinaestetica.es/', '+34633219106', 'info@elonamedicinastetica.es', 'Medical aesthetic clinic on Google Maps (4.9★, 89 reviews)', 4, 'Google 4.9★ from 89 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=545626488907354761&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 89, 'Último portal, junto al Mercadona, Cl. de Ayala, 87-89, Salamanca, 28006 Madrid, España', now()),
  ('clinic', 'Aura Clinic', 'Madrid', 'Spain', 'https://auraclinic.es/', '+34690967854', 'info@auraclinic.es', 'Medical aesthetic clinic on Google Maps (5★, 49 reviews)', 4, 'Google 5.0★ from 49 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=11346071819950915258&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 49, 'Cl. de Ayala, 53, Bajo derecha, Salamanca, 28001 Madrid, España', now()),
  ('clinic', 'Centro Salamanca – Dra. Isabel Arias', 'Madrid', 'Spain', 'https://centrosalamanca.es/', '+34611025424', 'recepcion@centrosalamanca.es', 'Medical aesthetic clinic on Google Maps (5★, 40 reviews)', 4, 'Google 5.0★ from 40 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=14792345101659744002&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 40, 'Calle de Castelló, 41, Bajo Izquierda, Salamanca, 28001 Madrid, España', now()),
  ('clinic', 'IML CLINIC', 'Madrid', 'Spain', 'https://www.iml.es/', null, null, 'Medical aesthetic clinic on Google Maps (4.9★, 137 reviews)', 4, 'Google 4.9★ from 137 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13998080301877569886&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 137, 'C. de Hermosilla, 8, Salamanca, 28001 Madrid, España Phone +34 911 17 39 14.', now()),
  ('clinic', 'Soy Clínica Estética', 'Madrid', 'Spain', 'http://www.soymedicinaestetica.com/', '+34722552195', null, 'Medical aesthetic clinic on Google Maps (5★, 481 reviews)', 5, 'Google 5.0★ from 481 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=15682995804865008303&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 481, 'Calle del Príncipe de Vergara, 67, Salamanca, 28006 Madrid, España', now()),
  ('clinic', 'Clínica MBA', 'Madrid', 'Spain', 'https://clinicamba.com/', null, 'info@clinicamba.com', 'Medical aesthetic clinic on Google Maps (4.7★, 290 reviews)', 5, 'Google 4.7★ from 290 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=11622008614675372373&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 290, 'C. de Antonio Acuña, 3, Salamanca, 28009 Madrid, España Phone +34 915 76 52 41.', now()),
  ('clinic', 'Equilibra Medicina Estética Avanzada', 'Madrid', 'Spain', 'https://esteticaequilibra.com/', '+34695792949', 'esteticaequilibra@gmail.com', 'Medical aesthetic clinic on Google Maps (4.9★, 74 reviews)', 4, 'Google 4.9★ from 74 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=10193919101353250747&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 74, 'C. de Padilla, 74, Salamanca, 28006 Madrid, España', now()),
  ('clinic', 'Clínica Angie Sandoval Aesthetic', 'Madrid', 'Spain', 'https://ascentromedicoestetico.com/', '+34621062888', null, 'Medical aesthetic clinic on Google Maps (4.9★, 228 reviews)', 5, 'Google 4.9★ from 228 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=321462850264164757&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 228, 'C. de Claudio Coello, 51, Portal 2. 1º izq, Salamanca, 28001 Madrid, España', now()),
  ('clinic', 'CLS Medicina Estética', 'Madrid', 'Spain', 'https://clsmedicinaestetica.es/', '+34691763347', 'info@clsmedicinaestetica.es', 'Medical aesthetic clinic on Google Maps (5★, 49 reviews)', 4, 'Google 5.0★ from 49 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=6511057464052878947&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 49, 'Calle de Modesto Lafuente, 5, Chamberí, 28010 Madrid, España', now()),
  ('clinic', 'Dra. Rosangela Obregón', 'Madrid', 'Spain', 'https://drarosangelaobregon.com/', '+34692652949', 'info@drarosangelaobregon.com', 'Medical aesthetic clinic on Google Maps (4.9★, 108 reviews)', 4, 'Google 4.9★ from 108 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=16863078058608312786&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 108, 'Av. de Monteclaro, 515, 28223 Pozuelo de Alarcón, Madrid, España', now()),
  ('clinic', 'Gooru Clinic', 'Madrid', 'Spain', 'http://www.gooruclinic.com/', '+34655826657', 'info@ccgooruclinic.com', 'Medical aesthetic clinic on Google Maps (5★, 52 reviews)', 4, 'Google 5.0★ from 52 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=8826625832210016457&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 52, 'Av. de Europa, 16, chalet 8, 28224 Pozuelo de Alarcón, Madrid, España', now()),
  ('clinic', 'Bella Donna Aesthetic Clinic', 'Madrid', 'Spain', null, '+34614347180', null, 'Medical aesthetic clinic on Google Maps (4.8★, 53 reviews)', 4, 'Google 4.8★ from 53 reviews; medical aesthetic clinic', 'high', 'google', 'https://maps.google.com/?cid=8785500925945679245&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 53, 'C/ de Cirilo Palomo, 4, 28223 Pozuelo de Alarcón, Madrid, España', now()),
  ('clinic', 'Clínica Dr. Granado-Tiagonce', 'Madrid', 'Spain', 'https://clinicagranadotiagonce.com/?utm_source=google&utm_medium=Maps&utm_campaign=Google%20Maps&utm_content=web', null, 'info@clinicagranadotiagonce.com', 'Medical aesthetic clinic on Google Maps (4.8★, 385 reviews)', 5, 'Google 4.8★ from 385 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=5054201403459089856&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 385, 'Ctra. de Húmera, 63, 28224 Pozuelo de Alarcón, Madrid, España Phone +34 913 52 16 97.', now()),
  ('clinic', 'CLÍNICA VISO', 'Barcelona', 'Spain', 'http://www.clinicaviso.com/', '+34669918437', null, 'Medical aesthetic clinic on Google Maps (4.9★, 531 reviews)', 5, 'Google 4.9★ from 531 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13815973324019182851&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 531, 'Av. Diagonal, 590, Sarrià-Sant Gervasi, 08021 Barcelona, España', now()),
  ('clinic', 'Dra Krystel Cano', 'Barcelona', 'Spain', 'https://drakrystelcano.com/', '+34641322241', 'info@drakrystelcano.com', 'Medical aesthetic clinic on Google Maps (5★, 957 reviews)', 5, 'Google 5.0★ from 957 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=17109743071730094294&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 957, 'Carrer de Marià Cubí, 97, Sarrià-Sant Gervasi, 08021 Barcelona, España', now()),
  ('clinic', 'Antiaging Group Barcelona', 'Barcelona', 'Spain', 'https://www.antiaginggroupbarcelona.com/?utm_source=google&utm_medium=organic&utm_campaign=gmb', null, 'info@antiaginggroupbarcelona.com', 'Medical aesthetic clinic on Google Maps (4.9★, 710 reviews)', 4, 'Google 4.9★ from 710 reviews; medical clinic on Google; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=15848119911529671303&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 710, 'Rda. Gral. Mitre, 84, Sarrià-Sant Gervasi, 08021 Barcelona, España Phone +34 932 52 23 49.', now()),
  ('clinic', 'Clínica Dra. Laura Sitú', 'Barcelona', 'Spain', 'http://www.dralaurasitu.com/', '+34619672664', 'info@dralaurasitu.com', 'Medical aesthetic clinic on Google Maps (4.7★, 101 reviews)', 4, 'Google 4.7★ from 101 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=9546899845029079298&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 101, 'Pg. de la Bonanova, 69, 2da Planta, Sarrià-Sant Gervasi, 08017 Barcelona, España', now()),
  ('clinic', 'Dr Gonzalo Wiersba', 'Barcelona', 'Spain', 'https://terapiaregenerativa.es/', '+34665306898', 'gwiersba@terapiaregenerativa.es', 'Medical aesthetic clinic on Google Maps (4.9★, 143 reviews)', 4, 'Google 4.9★ from 143 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=17588654787866140748&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 143, 'Carrer Francesc Pérez Cabrero, 11A, entresuelo 4a, Sarrià-Sant Gervasi, 08021 Barcelona, España', now()),
  ('clinic', 'Dra. Adriana León', 'Barcelona', 'Spain', 'http://www.draadrianaleon.com/', '+34647025339', 'dra.adrianaleon.me@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 77 reviews)', 4, 'Google 5.0★ from 77 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=240563228186937952&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 77, 'Carrer del Mestre Nicolau, 8, Loc 2, Sarrià-Sant Gervasi, 08021 Barcelona, España', now()),
  ('clinic', 'Toral Clinic', 'Barcelona', 'Spain', 'https://toralclinic.com/?utm_source=gbp&utm_medium=perfil&utm_campaign=gbp', '+34621255568', 'info@toralclinic.com', 'Medical aesthetic clinic on Google Maps (4.9★, 191 reviews)', 5, 'Google 4.9★ from 191 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=14207909924521805850&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 191, 'Av. Diagonal, 598, Entresuelo, 2ª, Sarrià-Sant Gervasi, 08021 Barcelona, España', now()),
  ('clinic', 'Medisoc Medicina Estética', 'Barcelona', 'Spain', 'http://www.medisoc.es/', null, 'medisoc@medisoc.es', 'Medical aesthetic clinic on Google Maps (4.9★, 59 reviews)', 4, 'Google 4.9★ from 59 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=18163184833316209376&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 59, 'Carrer de Manuel de Falla, 38, Sarrià-Sant Gervasi, 08034 Barcelona, España Phone +34 932 80 23 60.', now()),
  ('clinic', 'Clinica Dra Leila Bidaki de Medicina Estética y Cirugía Plástica', 'Barcelona', 'Spain', 'https://clinicadraleila.com/', null, null, 'Medical aesthetic clinic on Google Maps (4.9★, 97 reviews)', 4, 'Google 4.9★ from 97 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=12559689184068452914&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 97, 'Carrer d''Alacant, 26, Loc 1, 08022, Sarrià-Sant Gervasi, 08022 Barcelona, España Phone +34 931 39 36 82.', now()),
  ('clinic', 'Noan Clinic', 'Barcelona', 'Spain', 'http://www.noanclinic.com/', null, 'info@noanclinic.com', 'Medical aesthetic clinic on Google Maps (4.8★, 477 reviews)', 5, 'Google 4.8★ from 477 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=5061215552014969252&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 477, 'Carrer de Muntaner, 471, Sarrià-Sant Gervasi, 08021 Barcelona, España Phone +34 931 68 23 06.', now()),
  ('clinic', 'Beautyderm', 'Barcelona', 'Spain', 'http://www.beautyderm.es/', null, 'info@beautyderm.es', 'Medical aesthetic clinic on Google Maps (4.9★, 125 reviews)', 4, 'Google 4.9★ from 125 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=3532671179156567842&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 125, 'Plaça d''Eguilaz, 3, Sarrià-Sant Gervasi, 08017 Barcelona, España Phone +34 932 05 87 86.', now()),
  ('clinic', 'Prestige Clínica de Medicina Estética', 'Sitges', 'Spain', 'http://www.clinicaprestige.com/', '+34696401532', 'info@clinicaprestige.com', 'Medical aesthetic clinic on Google Maps (4.9★, 60 reviews)', 4, 'Google 4.9★ from 60 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=3369990030971251349&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 60, 'Carrer de Salvador Olivella, 17, Loc 79A, 08870 Sitges, Barcelona, España', now()),
  ('clinic', 'Clínica Mediface', 'Sitges', 'Spain', 'https://clinicamediface.com/', null, 'info@clinicamediface.com', 'Medical aesthetic clinic on Google Maps (4.9★, 104 reviews)', 4, 'Google 4.9★ from 104 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=3895285603805014659&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 104, 'Rambla del Garraf, 48, 08812 Les Roquetes, Barcelona, España Phone +34 936 69 57 27.', now()),
  ('clinic', 'Golden Estética Sitges', 'Barcelona', 'Spain', null, '+34600586734', null, 'Medical aesthetic clinic on Google Maps (4.9★, 75 reviews)', 3, 'Google 4.9★ from 75 reviews; medical clinic on Google', 'medium', 'google', 'https://maps.google.com/?cid=6961559318549088844&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 75, 'Av. Josep Miró Argenter, 2, Bjs 1ª, 08870 Sitges, Barcelona, España', now()),
  ('clinic', 'Clínica Dra. Giangreco', 'Valencia', 'Spain', 'http://www.clinicagiangreco.com/', '+34605828577', 'info@clinicagiangreco.com', 'Medical aesthetic clinic on Google Maps (5★, 273 reviews)', 4, 'Google 5.0★ from 273 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=7990560436122608451&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 273, 'Calle San Vicente Mártir, 220, 1er. Piso, Oficina 2, Jesús, 46007 Valencia, España', now()),
  ('clinic', 'Clínica Dr. Jones', 'Valencia', 'Spain', 'https://clinicadrjones.com/', '+34613851491', 'contacto@clinicadrjones.com', 'Medical aesthetic clinic on Google Maps (4.6★, 208 reviews)', 3, 'Google 4.6★ from 208 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=6307847070133647323&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 208, 'Carrer de Ciscar, 31, L''Eixample, 46005 València, Valencia, España', now()),
  ('clinic', 'Clínica Dra. Veruskha Gómez', 'Valencia', 'Spain', 'https://drveruskhagomez.com/', '+34611364648', 'info.drveruskhagomez@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 96 reviews)', 3, 'Google 5.0★ from 96 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=5438879124262520347&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 96, 'Pl. de España, 2, Piso 2, Puerta 3, Extramurs, 46007 Valencia, España', now()),
  ('clinic', 'Clínica Dr. Alberto Marina', 'Valencia', 'Spain', 'https://albertomarina.es/', null, 'info@albertomarina.es', 'Medical aesthetic clinic on Google Maps (4.9★, 451 reviews)', 4, 'Google 4.9★ from 451 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=1405753869288574783&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 451, 'Gran Via del Marqués del Túria, 22, L''Eixample, 46005 València, Valencia, España Phone +34 963 89 05 90.', now()),
  ('clinic', 'Clínica de estética Benaes', 'Valencia', 'Spain', 'https://www.benaes.com/?utm_campaign=GBP&utm_source=google&utm_medium=maps', '+34603541145', null, 'Medical aesthetic clinic on Google Maps (4.8★, 319 reviews)', 4, 'Google 4.8★ from 319 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=13415083887906718505&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 319, 'Carrer de Borriana, 42, L''Eixample, 46005 València, Valencia, España', now()),
  ('clinic', 'Clínica Villa Estética', 'Valencia', 'Spain', 'https://www.villaestetica.es/', '+34659778718', 'info@villaestetica.es', 'Medical aesthetic clinic on Google Maps (4.9★, 150 reviews)', 4, 'Google 4.9★ from 150 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=4274149762652932411&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 150, 'Cl. de Colón, 35 - 1, Pta 2, Ciutat Vella, 46004 Valencia, España', now()),
  ('clinic', 'Dra Nagore Conde', 'Valencia', 'Spain', 'https://nagoreconde.com/?utm_source=google&utm_medium=maps&utm_campaign=My%20Business&utm_content=dranagore', '+34621628379', 'dranagoreconde@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 84 reviews)', 3, 'Google 5.0★ from 84 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=9020806866885734063&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 84, 'Av. de l''Oest, 29, 1er piso, Ciutat Vella, 46002 València, Valencia, España', now()),
  ('clinic', 'Dra Bennie Peters', 'Valencia', 'Spain', 'http://www.drapeters.com/', '+34658011333', 'clinicame.bp@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 79 reviews)', 3, 'Google 5.0★ from 79 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=4947621789146802506&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 79, 'C/ de Jesús, 22, Extramurs, 46007 València, Valencia, España', now()),
  ('clinic', 'Clínica Mona', 'Valencia', 'Spain', 'https://clinicamona.com/', '+34644628459', 'info@clinicamona.com', 'Medical aesthetic clinic on Google Maps (4.9★, 69 reviews)', 3, 'Google 4.9★ from 69 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=6778772565865208856&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 69, 'Av. del Instituto Obrero de Valencia, 21, 1 planta - local 5, Quatre Carreres, 46013 Valencia, España', now()),
  ('clinic', 'LivClinic', 'Lisbon', 'Portugal', 'https://livclinic.pt/', '+351919105030', 'info@livclinic.pt', 'Medical aesthetic clinic on Google Maps (4.9★, 332 reviews)', 4, 'Google 4.9★ from 332 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=4342357480202028215&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 332, 'R. Nova dos Mercadores 27A, 1990-239 Lisboa, Portugal', now()),
  ('clinic', 'MM Clinic', 'Lisbon', 'Portugal', 'http://www.drmiguelmorgado.com/', '+351916666611', 'info@drmiguelmorgado.com', 'Medical aesthetic clinic on Google Maps (5★, 87 reviews)', 3, 'Google 5.0★ from 87 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=6147118053105696753&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 87, 'Av. da Liberdade 227 2º andar, 1250-140 Lisboa, Portugal', now()),
  ('clinic', 'Dra. July Alcantara l Facial Aesthetic Medicine', 'Lisbon', 'Portugal', 'http://drajulyalcantara.pt/', '+351919103133', null, 'Medical aesthetic clinic on Google Maps (5★, 64 reviews)', 3, 'Google 5.0★ from 64 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=6475479581466393432&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 64, 'Praça Duque de Saldanha 1 8.ºpiso MA, 1050-094 Lisboa, Portugal', now()),
  ('clinic', 'NOAGE Clinic', 'Lisbon', 'Portugal', 'https://noageclinic.com/', '+351933463580', 'geral@noageclinic.com', 'Medical aesthetic clinic on Google Maps (4.9★, 306 reviews)', 4, 'Google 4.9★ from 306 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=11846583480269654417&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 306, 'Av. Dom João II 84B, 1990-083 Lisboa, Portugal', now()),
  ('clinic', 'The Dr Pure Clinic', 'Lisbon', 'Portugal', 'https://thedrpure.com/', '+351923256513', 'clinic@thedrpure.com', 'Medical aesthetic clinic on Google Maps (4.9★, 282 reviews)', 4, 'Google 4.9★ from 282 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=11452365114788416460&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 282, 'Largo Luzia Maria Martins 1 B, 1600-825 Lisboa, Portugal', now()),
  ('clinic', 'Amado Clinic', 'Lisbon', 'Portugal', 'https://amadoclinic.pt/?utm_source=google&utm_medium=organic&utm_campaign=gbp', '+351911573701', 'info@amadoclinic.pt', 'Medical aesthetic clinic on Google Maps (4.8★, 79 reviews)', 3, 'Google 4.8★ from 79 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=9996257453306973202&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 79, 'Av. Álvares Cabral 25A, 1250-015 Lisboa, Portugal', now()),
  ('clinic', 'Skin Boutique by LMR', 'Lisbon', 'Portugal', 'https://www.skinboutique.pt/', null, 'geral@lmrcirurgiaplastica.pt', 'Medical aesthetic clinic on Google Maps (4.8★, 673 reviews)', 3, 'Google 4.8★ from 673 reviews; medical clinic on Google; top rated and busy; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=2380781765790548503&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 673, 'Av. João Crisóstomo 26B, 1050-127 Lisboa, Portugal Phone +351 21 099 9138.', now()),
  ('clinic', 'MP Aesthetic Clinic', 'Cascais', 'Portugal', 'http://www.mpclinic.pt/', null, 'geral@mpclinic.pt', 'Medical aesthetic clinic on Google Maps (5★, 365 reviews)', 5, 'Google 5.0★ from 365 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=9270022690150007925&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 365, 'R. Joaquim Ereira 1581 Loja A 1º Andar, 2750-392 Cascais, Portugal Phone +351 21 092 7611.', now()),
  ('clinic', 'Primum Medicina Estética', 'Cascais', 'Portugal', 'http://www.primummedicinaestetica.pt/', null, 'geral@primummedicinaestetica.pt', 'Medical aesthetic clinic on Google Maps (4.9★, 72 reviews)', 4, 'Google 4.9★ from 72 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=12088446401155058994&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 72, 'Marina de Cascais 01, 2750-800 Cascais, Portugal Phone +351 21 130 3074.', now()),
  ('clinic', 'S3 Clinic', 'Cascais', 'Portugal', 'https://s3clinic.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp', '+351964565050', 'contacto@s3clinic.pt', 'Medical aesthetic clinic on Google Maps (4.7★, 58 reviews)', 4, 'Google 4.7★ from 58 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=18396725990994521939&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 58, 'Edifício Estoril Sol, Av. Marginal 8648 loja 2, 2750-427 Cascais, Portugal', now()),
  ('clinic', 'Medical Skin Clinic', 'Cascais', 'Portugal', 'https://medicalskinclinics.com/', '+351913772099', 'contato@clinicamedica.pt', 'Medical aesthetic clinic on Google Maps (4.5★, 44 reviews)', 4, 'Google 4.5★ from 44 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=8438392771064799747&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 44, 'Casa da Guia, Avenida Nossa Senhora do Cabo 101 Piso 1 loja 16, 2750-374 Cascais, Portugal', now()),
  ('clinic', 'Beauty Concept', 'Cascais', 'Portugal', 'https://beautyconcept.pt/', '+351922267932', 'mmbeautyconcept.pt@gmail.com', 'Medical aesthetic clinic on Google Maps (5★, 67 reviews)', 4, 'Google 5.0★ from 67 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=16844791526291598269&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 67, 'R. Sacadura Cabral 131 Lj B, 2765-552 Estoril, Portugal', now()),
  ('clinic', 'Clínica CHF Carcavelos', 'Cascais', 'Portugal', 'http://www.clinicachf.pt/', '+351912421650', 'carcavelos@clinicachf.pt', 'Medical aesthetic clinic on Google Maps (4.6★, 90 reviews)', 4, 'Google 4.6★ from 90 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=5381941660998673319&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 90, 'Urbanização São Miguel das Encostas 296G, 2775-750 Carcavelos, Portugal', now()),
  ('clinic', 'Clínica Endul', 'Porto', 'Portugal', 'http://clinicaendul.pt/', '+351919548975', 'info@clinicaendul.pt', 'Medical aesthetic clinic on Google Maps (4.8★, 350 reviews)', 4, 'Google 4.8★ from 350 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=16047168310077061818&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 350, 'Av. Menéres 497, 4450-191 Matosinhos, Portugal', now()),
  ('clinic', 'Face Mi – Instituto Médico da Face', 'Porto', 'Portugal', 'https://face-mi.pt/', '+351962507903', 'geral@face-mi.com', 'Medical aesthetic clinic on Google Maps (5★, 328 reviews)', 4, 'Google 5.0★ from 328 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=7375260027587825253&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 328, 'R. Dr. Emílio Peres 47, 4050-007 Porto, Portugal', now()),
  ('clinic', 'Proage Clinic by Joana Lino', 'Porto', 'Portugal', 'https://www.proageclinic.pt/', '+351934935050', 'proageclinic@byjoanalino.com', 'Medical aesthetic clinic on Google Maps (4.9★, 310 reviews)', 4, 'Google 4.9★ from 310 reviews; medical aesthetic clinic; top rated and busy; no PMU on its website: pitch adding it', 'high', 'google', 'https://maps.google.com/?cid=3940389946752287041&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 310, 'Rua de Gondarem n782 Fraçao E, 4150-373 Porto, Portugal', now()),
  ('clinic', 'NL Clinic', 'Porto', 'Portugal', 'http://www.nlclinic.pt/', '+351911144643', 'nlclinic@outlook.pt', 'Medical aesthetic clinic on Google Maps (5★, 104 reviews)', 3, 'Google 5.0★ from 104 reviews; medical aesthetic clinic; no PMU on its website: pitch adding it', 'medium', 'google', 'https://maps.google.com/?cid=15557190536571112205&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 104, 'Rua de Camões 117 5º andar, 4000-059 Porto, Portugal', now()),
  ('clinic', 'Clínica de Estética Daiane Dias', 'Albufeira', 'Portugal', null, '+351969944765', null, 'Medical aesthetic clinic on Google Maps (5★, 114 reviews)', 3, 'Google 5.0★ from 114 reviews; medical aesthetic clinic', 'medium', 'google', 'https://maps.google.com/?cid=12166609122323941841&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA', 114, 'Urb, R. Q.ta dos Caliços A17 Loja 1, 8200-666 Albufeira, Portugal', now())
on conflict (name, city) do nothing;
