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
