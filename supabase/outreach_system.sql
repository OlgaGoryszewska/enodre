-- Outreach system (19 Oct 2026): industry playbooks, prospect research on the
-- lead, draft → approved → sent messages, a 3-step follow-up sequence, a
-- do-not-contact stop, and deal value for revenue tracking.
-- Additive and safe to re-run. Run AFTER gtm_command_centre.sql.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 1. Leads
alter table public.potential_customers add column if not exists industry text;
alter table public.potential_customers drop constraint if exists potential_customers_industry_check;
-- keep in sync with INDUSTRY_VALUES in src/lib/industry-playbooks.ts
alter table public.potential_customers add constraint potential_customers_industry_check
  check (industry in ('contractor', 'electrical_plumbing', 'equipment_rental', 'technical_service', 'logistics', 'fuel_energy', 'cleaning_facility', 'other'));

-- Research on the prospect itself: { summary, facts: [{fact, source_url}],
-- signals: [{signal, source_url}], likely_pain, pain_evidence, how_we_help,
-- confidence, message_no, researched_at }. Facts have sources; the rest are
-- labelled hypotheses in the UI.
alter table public.potential_customers add column if not exists research jsonb;
-- "Please don't contact us again": stops the follow-up sequence and sending.
alter table public.potential_customers add column if not exists do_not_contact boolean not null default false;
alter table public.potential_customers add column if not exists deal_value_nok numeric(12, 2);
alter table public.potential_customers drop constraint if exists potential_customers_deal_value_check;
alter table public.potential_customers add constraint potential_customers_deal_value_check check (deal_value_nok >= 0);

-- Backfill industry from the finder's register data (mirrors industryFromCode).
update public.potential_customers p
set industry = case
    when c.industry_code like '43.21%' or c.industry_code like '43.22%' then 'electrical_plumbing'
    when c.industry_code like '41.%' or c.industry_code like '42.%' or c.industry_code like '43.%' then 'contractor'
    when c.industry_code like '77.3%' then 'equipment_rental'
    when c.industry_code like '33.%' or c.industry_code like '09.%' then 'technical_service'
    when c.industry_code like '49.%' or c.industry_code like '52.%' then 'logistics'
    when c.industry_code like '46.81%' or c.industry_code like '35.%' then 'fuel_energy'
    when c.industry_code like '81.%' then 'cleaning_facility'
    else 'other'
  end
from public.lead_candidates c
where p.industry is null and (c.potential_customer_id = p.id or (p.org_number is not null and c.org_number = p.org_number));

-- The 10 hand-picked prospects (industry codes checked in the register 14 Oct).
update public.potential_customers set industry = 'fuel_energy' where industry is null and org_number in ('962956491', '915957463');
update public.potential_customers set industry = 'technical_service' where industry is null and org_number = '976069285';
update public.potential_customers set industry = 'contractor' where industry is null and org_number in ('912628752', '938524831', '930705462', '956813301', '997020332');
update public.potential_customers set industry = 'logistics' where industry is null and org_number in ('987647736', '988556033');

-- Backfill research from the research agent's result for approved leads…
update public.potential_customers p
set research = c.research || jsonb_build_object('researched_at', c.researched_at)
from public.lead_candidates c
where p.research is null and c.research is not null and c.potential_customer_id = p.id;
-- …and give hand-entered opener facts a place in the research.
update public.potential_customers
set research = jsonb_build_object('facts', jsonb_build_array(jsonb_build_object('fact', opener_fact, 'source_url', opener_source)))
where research is null and opener_fact is not null and opener_source is not null;

-- ---------------------------------------------------------------------------
-- 2. Messages: draft → approved → sent, and the 3-step sequence.
alter table public.lead_messages add column if not exists status text not null default 'sent';
alter table public.lead_messages drop constraint if exists lead_messages_status_check;
alter table public.lead_messages add constraint lead_messages_status_check check (status in ('draft', 'approved', 'sent'));
alter table public.lead_messages add column if not exists approved_at timestamptz;
alter table public.lead_messages add column if not exists sent_at timestamptz;
alter table public.lead_messages add column if not exists quality jsonb;
update public.lead_messages set sent_at = created_at where status = 'sent' and sent_at is null;

-- keep in sync with MESSAGE_KIND_VALUES in src/lib/outreach-templates.ts
alter table public.lead_messages drop constraint if exists lead_messages_kind_check;
alter table public.lead_messages add constraint lead_messages_kind_check
  check (kind in ('connection_note', 'first_message', 'email', 'follow_up', 'final_follow_up', 'phone_opener'));

-- One open (unsent) draft per lead and message type: saving again updates it.
create unique index if not exists lead_messages_one_open_draft
  on public.lead_messages (lead_id, kind) where status in ('draft', 'approved');

-- ---------------------------------------------------------------------------
-- 3. AI drafts are logged in the same spend ledger as research.
alter table public.lead_research_runs drop constraint if exists lead_research_runs_outcome_check;
alter table public.lead_research_runs add constraint lead_research_runs_outcome_check
  check (outcome in ('researched', 'failed', 'over_budget', 'drafted'));

notify pgrst, 'reload schema';
