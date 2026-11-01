-- Recruiters & companies tracker (Find jobs): specialist agencies, named
-- recruiters you add, and target HealthTech/BeautyTech companies — with a
-- status per contact. Seeded from the career research (2 Nov 2026).
-- Idempotent — safe to run more than once. Run in the Supabase SQL Editor.

create table if not exists public.career_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('agency', 'recruiter', 'company')),
  name text not null,
  organisation text,
  website text,
  linkedin text,
  coverage text,
  specialisation text,
  fit text check (fit in ('high', 'medium', 'low')),
  roles text,
  industry text,
  email text,
  notes text,
  status text not null default 'to_contact'
    check (status in ('to_contact', 'contacted', 'replied', 'interviewing', 'not_relevant')),
  last_contacted_on date,
  unique (kind, name)
);

alter table public.career_contacts enable row level security;
drop policy if exists "Admins manage career contacts" on public.career_contacts;
create policy "Admins manage career contacts" on public.career_contacts
  for all to authenticated using (true) with check (true);

insert into public.career_contacts (kind, name, website, linkedin, coverage, specialisation, fit, roles, industry) values
  ('agency', 'Storm3', 'https://storm3.com', 'https://www.linkedin.com/search/results/people/?keywords=Storm3%20healthtech%20recruiter', 'UK, Europe, US, APAC', 'HealthTech only: digital health, telemedicine, health analytics', 'high', null, null),
  ('agency', 'Meet Life Sciences', 'https://www.meetlifesciences.com/medical-technology-healthtech/digital-health-and-health-tech/', 'https://www.linkedin.com/search/results/people/?keywords=Meet%20Life%20Sciences%20digital%20health', 'US, Europe', 'Digital health: product, software, data, GTM, QA — contact@meetlifesciences.com', 'high', null, null),
  ('agency', 'Barrington James', 'https://www.barringtonjames.com/healthtech-recruitment/', 'https://www.linkedin.com/search/results/people/?keywords=Barrington%20James%20healthtech', 'UK, DE, NL, CH, IE, US, APAC', 'HealthTech, SaMD, connected devices', 'high', null, null),
  ('agency', 'Optima Europe', 'https://www.optimaeurope.com', 'https://www.linkedin.com/search/results/people/?keywords=Optima%20Europe%20digital%20health%20recruiter', 'Europe', 'Digital health and clinical AI', 'high', null, null),
  ('agency', 'Headcount AG', 'https://headcount.ch', 'https://www.linkedin.com/search/results/people/?keywords=Headcount%20AG%20recruiter', 'Switzerland, Europe', 'Digital health and life sciences', 'medium', null, null),
  ('agency', 'EPM Scientific', 'https://www.epmscientific.com/en-us/request-talent/digital-health-recruitment', 'https://www.linkedin.com/search/results/people/?keywords=EPM%20Scientific%20digital%20health', 'Europe, US, APAC', 'Digital health, medtech, pharma (Phaidon International)', 'medium', null, null),
  ('agency', 'SRG Talent', 'https://www.srgtalent.com', 'https://www.linkedin.com/search/results/people/?keywords=SRG%20healthtech%20recruiter', 'UK', 'HealthTech commercial, management, regulatory', 'medium', null, null),
  ('agency', 'Proclinical', 'https://www.proclinical.com', 'https://www.linkedin.com/search/results/people/?keywords=Proclinical%20digital%20health', 'Basel, Munich, global', 'Life sciences, some digital health', 'medium', null, null),
  ('agency', 'Borka Consulting', 'https://www.borka.no/english', 'https://www.linkedin.com/search/results/people/?keywords=Borka%20Consulting', 'Oslo, Nordics, Europe', 'Life sciences only', 'high', null, null),
  ('agency', 'PharmaRelations', 'https://www.pharmarelations.com/services/specialist-recruitment', 'https://www.linkedin.com/search/results/people/?keywords=PharmaRelations%20Norway', 'Nordics (Oslo office)', 'Life science and medtech', 'medium', null, null),
  ('agency', 'Compass HRG', 'https://www.compasshrg.com/industries/life-sciences-and-healthcare/', 'https://www.linkedin.com/search/results/people/?keywords=Compass%20HRG%20life%20science', 'Oslo', 'Life sciences, pharma, medtech', 'medium', null, null),
  ('agency', 'Pharmadrome', 'https://pharmadrome.com/locations/norway/', 'https://www.linkedin.com/search/results/people/?keywords=Pharmadrome', 'Norway', 'Pharma and medtech', 'medium', null, null),
  ('agency', 'Antal Madrid', 'https://www.antal.com/recruitment/spain-madrid-cgc', 'https://www.linkedin.com/search/results/people/?keywords=Antal%20Spain%20life%20sciences', 'Spain, abroad', 'IT and life sciences, mid-level and up', 'high', null, null),
  ('agency', 'Approach People', 'https://www.approachpeople.com/recruitment-spain', 'https://www.linkedin.com/search/results/people/?keywords=Approach%20People%20recruiter', 'Barcelona, Madrid', 'Life sciences, international', 'medium', null, null),
  ('agency', 'Allen Recruitment', 'https://allenrec.com/spain/', 'https://www.linkedin.com/search/results/people/?keywords=Allen%20Recruitment%20Spain', 'Spain', 'IT, life sciences, tech', 'medium', null, null),
  ('agency', 'Eurogalenus', 'https://eurogalenus.com/executive-search-barcelona/', null, 'Barcelona, global', 'Executive search: pharma, biotech, digital health (senior only)', 'low', null, null),
  ('agency', 'Boyden Spain', 'https://www.boyden.com/spain/', null, 'Spain', 'Executive search: healthcare and life sciences (senior only)', 'low', null, null),
  ('company', 'Doctolib', 'https://startup.jobs/company/doctolib-2', null, 'France, DE, IT, NL; remote/hybrid', 'HealthTech: Booking, teleconsultation and records for health professionals', 'high', 'Customer success, implementation, product ops', 'HealthTech'),
  ('company', 'Alan', 'https://alan.com', null, 'France, Spain, Belgium', 'HealthTech: Digital health insurance and health app', 'medium', 'Customer care, ops, product', 'HealthTech'),
  ('company', 'Clinic Cloud / Doctoralia', 'https://clinic-cloud.com', null, 'Barcelona', 'HealthTech: Cloud clinic management (Docplanner group)', 'high', 'Implementation, customer success, product specialist', 'HealthTech'),
  ('company', 'Docplanner', 'https://www.docplanner.com', null, 'Warsaw, Barcelona', 'HealthTech: Doctor booking and clinic software (ZnanyLekarz, Doctoralia)', 'high', 'Implementation, product specialist, UX', 'HealthTech'),
  ('company', 'Infermedica', 'https://infermedica.com', null, 'Wrocław', 'HealthTech: AI symptom checking and patient triage', 'medium', 'Product specialist, UX, solutions', 'HealthTech'),
  ('company', 'LUX MED', 'https://www.luxmed.pl', null, 'Poland', 'HealthTech: Private healthcare group, digital patient services', 'medium', 'Digital product, CX', 'HealthTech'),
  ('company', 'DIPS', 'https://www.dips.com', null, 'Norway', 'HealthTech: Hospital records (85%+ of Norwegian hospitals)', 'high', 'Implementation, application specialist', 'HealthTech'),
  ('company', 'Aidn', 'https://www.aidn.no', null, 'Norway', 'HealthTech: Care and municipality health software (Kernel)', 'high', 'Implementation, customer success', 'HealthTech'),
  ('company', 'Dignio', 'https://dignio.com', null, 'Oslo, Europe, North America', 'HealthTech: Remote patient monitoring and home-based care', 'high', 'Implementation, customer success, product', 'HealthTech'),
  ('company', 'Kry / Livi', 'https://www.kry.no', null, 'Nordics, UK, France', 'HealthTech: Telemedicine', 'medium', 'Product ops, CX, UX', 'HealthTech'),
  ('company', 'DNV Imatis', 'https://www.imatis.com', null, 'Norway', 'HealthTech: Hospital patient-flow software', 'medium', 'Implementation', 'HealthTech'),
  ('company', 'Quibim', 'https://quibim.com', null, 'Valencia', 'HealthTech: AI imaging biomarkers (MRI/CT)', 'medium', 'Product specialist, customer success', 'HealthTech'),
  ('company', 'MYSPHERA', 'https://www.mysphera.com', null, 'Valencia', 'HealthTech: Real-time patient and operating-room coordination', 'medium', 'Implementation', 'HealthTech'),
  ('company', 'Pabau', 'https://pabau.com', null, 'Bedford UK; 40+ countries', 'BeautyTech: Aesthetic clinic records, booking, payments, marketing', 'high', 'Implementation, product specialist, customer success', 'BeautyTech'),
  ('company', 'Clinicminds', 'https://www.clinicminds.com', null, 'Amsterdam', 'BeautyTech: Cloud records and practice management for aesthetic clinics', 'high', 'Implementation, onboarding, product', 'BeautyTech'),
  ('company', 'Nextmotion', 'https://www.nextmotion.net', null, 'France, international', 'BeautyTech: Aesthetic medicine clinic platform with photo documentation', 'high', 'Product specialist, customer success', 'BeautyTech'),
  ('company', 'Consentz', 'https://www.consentz.com', null, 'UK', 'BeautyTech: Aesthetic clinic software', 'medium', 'Customer success, implementation', 'BeautyTech'),
  ('company', 'Zenoti', 'https://www.zenoti.com', null, 'US, India, global', 'BeautyTech: Enterprise platform for beauty and medspa chains', 'medium', 'Implementation, solutions', 'BeautyTech'),
  ('company', 'Flowww', 'https://flowww.net', null, 'Spain', 'BeautyTech: All-in-one software for aesthetic medicine, beauty, health', 'high', 'Implementation, customer success', 'BeautyTech'),
  ('company', 'Koibox', 'https://koibox.cloud', null, 'Spain', 'BeautyTech: Booking and management for beauty and aesthetics centres', 'high', 'Onboarding, customer success', 'BeautyTech'),
  ('company', 'Bewe', 'https://bewe.io', null, 'Spain', 'BeautyTech: Digital platform for wellness centres and spas', 'medium', 'Product, customer success', 'BeautyTech'),
  ('company', 'Fresha', 'https://www.fresha.com', null, 'London; Madrid, Warsaw, Dubai offices', 'BeautyTech: Booking marketplace and software for salons and clinics', 'high', 'Partner success, onboarding, product ops', 'BeautyTech'),
  ('company', 'Booksy', 'https://booksy.com', null, 'Warsaw; Spain, UK, US, France', 'BeautyTech: Booking app for beauty and wellness', 'high', 'Implementation, customer success, product specialist', 'BeautyTech'),
  ('company', 'Treatwell', 'https://www.treatwell.com', null, 'London, Europe', 'BeautyTech: Beauty booking marketplace and salon software', 'medium', 'Account management, onboarding', 'BeautyTech'),
  ('company', 'Phorest', 'https://www.phorest.com', null, 'Dublin; remote NI team', 'BeautyTech: Salon and spa software', 'medium', 'Customer success, implementation', 'BeautyTech'),
  ('company', 'Haut.AI', 'https://haut.ai', null, 'Tallinn', 'BeautyTech: B2B AI skin analysis for beauty brands', 'high', 'Solutions consultant, product specialist', 'BeautyTech'),
  ('company', 'Perfect Corp', 'https://www.perfectcorp.com', null, 'Taiwan, global', 'BeautyTech: YouCam AR/AI beauty and skin tools', 'medium', 'Solutions, customer success', 'BeautyTech'),
  ('company', 'Revieve', 'https://www.revieve.com', null, 'Global', 'BeautyTech: AI skin diagnostics and personalised recommendations', 'medium', 'Solutions, implementation', 'BeautyTech')
on conflict (kind, name) do nothing;
