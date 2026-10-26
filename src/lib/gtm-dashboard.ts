// Builds the GTM command centre (Today's priorities, performance, weekly
// activity, week-4 gate) from the database rows. Everything is derived on
// each page load, so refreshing can never create duplicate tasks.
import { addBusinessDays, computeGate, startOfWeek } from "@/lib/gtm-logic";
import { CLOSED_STATUSES, followUpDate, type PotentialCustomer } from "@/lib/potential-customer";
import type { LeadCandidate } from "@/lib/lead-candidate";
import type { DiscoveryCall } from "@/lib/discovery-call";
import { isSentMessage, type LeadMessage } from "@/lib/outreach-templates";
import { GTM_MILESTONES, WEEKLY_TARGETS } from "@/lib/gtm-plan";

export type PriorityTask = {
  key: string;
  priority: number; // 1 = most urgent
  title: string;
  detail: string;
  href: string;
  leadId?: string;
  canSnooze?: boolean; // follow-up tasks: push the date out
  canClear?: boolean; // follow-up tasks: no follow-up needed
  urgent?: boolean;
};

export type ResearchRun = { created_at: string; cost_usd: number; outcome: string };

export type FunnelRow = { label: string; value: number; hint?: string; target?: number; targetLabel?: string };

const leadName = (lead: PotentialCustomer) => lead.company || lead.name;
const leadHref = (id: string) => `/admin/marketing/leads/${id}`;

export function buildPriorities(input: {
  leads: PotentialCustomer[];
  candidates: LeadCandidate[];
  calls: DiscoveryCall[];
  messages?: LeadMessage[];
  today: string;
}): PriorityTask[] {
  const { leads, candidates, calls, today } = input;
  const messages = input.messages ?? [];
  const tasks: PriorityTask[] = [];
  const tomorrow = addBusinessDays(today, 1);
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const leadsWithCalls = new Set(calls.filter((call) => call.status !== "cancelled").map((call) => call.lead_id));

  for (const lead of leads) {
    if (CLOSED_STATUSES.includes(lead.status)) continue;
    const due = followUpDate(lead);
    if (due && due <= today) {
      tasks.push({
        key: `follow-up:${lead.id}`,
        priority: due < today ? 1 : 3,
        urgent: due < today,
        title: `${due < today ? "Overdue follow-up" : "Follow up today"}: ${leadName(lead)}`,
        detail:
          lead.next_action ||
          (lead.status === "proposal_sent" ? "Follow up on the proposal" : "Send the one follow-up"),
        href: leadHref(lead.id),
        leadId: lead.id,
        canSnooze: lead.next_follow_up_on !== undefined,
        canClear: lead.next_follow_up_on !== undefined,
      });
    }
    if (lead.responded && ["new", "contacted", "interested"].includes(lead.status) && !leadsWithCalls.has(lead.id)) {
      tasks.push({
        key: `replied:${lead.id}`,
        priority: 2,
        title: `Replied: ${leadName(lead)}`,
        detail: "Record their reply and book a discovery call",
        href: leadHref(lead.id),
        leadId: lead.id,
      });
    }
  }

  for (const call of calls) {
    if (call.status !== "booked") continue;
    const lead = leadsById.get(call.lead_id);
    if (!lead) continue;
    const soon = !call.scheduled_on || call.scheduled_on <= tomorrow;
    tasks.push({
      key: `call:${call.id}`,
      priority: soon ? 2 : 5,
      title: `Discovery call ${call.scheduled_on ? `on ${call.scheduled_on}` : "(no date yet)"}: ${leadName(lead)}`,
      detail: call.scheduled_on ? "Prepare: read their notes and the interview guide" : "Agree a date for the call",
      href: leadHref(lead.id),
      leadId: lead.id,
    });
  }

  const waiting = leads.filter((lead) => lead.status === "new" && !lead.first_contacted_on);
  if (waiting.length > 0) {
    // Best segments first: F (FuelFlo-like) and A before B and C.
    const order = { F: 0, A: 1, B: 2, C: 3 } as const;
    const next = [...waiting]
      .sort((a, b) => (order[a.segment ?? "C"] ?? 4) - (order[b.segment ?? "C"] ?? 4))
      .slice(0, 3);
    tasks.push({
      key: "first-contact",
      priority: 4,
      title: `${waiting.length} lead${waiting.length === 1 ? "" : "s"} waiting for a first contact`,
      detail: `Start with ${next.map(leadName).join(", ")}`,
      href: "/admin/marketing#leads",
    });
  }

  // Outreach work in progress: approved messages are ready to go out; drafts need review.
  const approvedUnsent = messages.filter((m) => m.status === "approved");
  if (approvedUnsent.length > 0) {
    tasks.push({
      key: "approved-unsent",
      priority: 2,
      title: `${approvedUnsent.length} approved message${approvedUnsent.length === 1 ? "" : "s"} ready to send`,
      detail: "Open the lead, send it or log it as sent",
      href: approvedUnsent.length === 1 ? leadHref(approvedUnsent[0].lead_id) : "/admin/marketing#composer",
    });
  }
  const drafts = messages.filter((m) => m.status === "draft");
  if (drafts.length > 0) {
    tasks.push({
      key: "drafts",
      priority: 4,
      title: `${drafts.length} draft${drafts.length === 1 ? "" : "s"} waiting for review`,
      detail: "Check the quality notes, then approve",
      href: drafts.length === 1 ? leadHref(drafts[0].lead_id) : "/admin/marketing#composer",
    });
  }

  const failed = candidates.filter((candidate) => candidate.status === "failed");
  if (failed.length > 0) {
    const blocked = failed.some(
      (candidate) => candidate.error_kind === "blocked" || /credit balance/i.test(candidate.error ?? "")
    );
    tasks.push({
      key: "research-failed",
      priority: blocked ? 3 : 5,
      title: `${failed.length} research job${failed.length === 1 ? "" : "s"} failed`,
      detail: blocked
        ? "Account problem — add Anthropic credits, then retry"
        : "Check the errors, retry, or add them without research",
      href: "/admin/marketing#lead-finder",
    });
  }

  const queued = candidates.filter((candidate) => candidate.status === "found");
  if (queued.length > 0) {
    tasks.push({
      key: "research-queued",
      priority: 6,
      title: `${queued.length} compan${queued.length === 1 ? "y" : "ies"} to research or add`,
      detail: "Research a batch, or add the best ones straight to customers",
      href: "/admin/marketing#lead-finder",
    });
  }

  return tasks.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

/** The latest non-cancelled call per lead (calls arrive newest first). */
function latestCallPerLead(calls: DiscoveryCall[]) {
  const latest = new Map<string, DiscoveryCall>();
  for (const call of calls) {
    if (call.status === "cancelled") continue;
    const current = latest.get(call.lead_id);
    // Prefer a completed call over a booked one; otherwise the newest.
    if (!current || (current.status !== "completed" && call.status === "completed")) latest.set(call.lead_id, call);
  }
  return [...latest.values()];
}

export function buildPerformance(input: {
  leads: PotentialCustomer[];
  candidates: LeadCandidate[];
  calls: DiscoveryCall[];
  runs: ResearchRun[];
  messages: LeadMessage[];
  today: string;
}) {
  const { leads, candidates, calls, runs, messages, today } = input;
  const perLead = latestCallPerLead(calls);
  const completed = perLead.filter((call) => call.status === "completed");
  const qualified = completed.filter(
    (call) => (call.hours_per_week ?? 0) >= 5 && (call.pilot_interest === "yes" || call.pilot_interest === "maybe")
  );

  // Only things that really happened count: a drafted message isn't a contact,
  // a booked call isn't a completed one, a high fit score isn't "qualified".
  const linkedLeads = new Set(candidates.map((c) => c.potential_customer_id).filter(Boolean));
  const funnel: FunnelRow[] = [
    { label: "Companies discovered", value: candidates.length },
    {
      label: "Prospects researched",
      value:
        candidates.filter((c) => c.research).length + leads.filter((l) => l.research && !linkedLeads.has(l.id)).length,
    },
    { label: "Prospects qualified", value: leads.length, hint: "Approved into the Leads pipeline" },
    { label: "Messages drafted", value: messages.length },
    { label: "Messages approved", value: messages.filter((m) => m.status === "approved" || isSentMessage(m)).length },
    { label: "Messages sent", value: messages.filter(isSentMessage).length },
    { label: "Replies received", value: leads.filter((l) => l.responded).length },
    { label: "Positive replies", value: leads.filter((l) => l.responded && l.attitude === "positive").length },
    { label: "Meetings booked", value: perLead.length, hint: "Discovery calls booked or held" },
    {
      label: "Discovery calls completed",
      value: completed.length,
      target: GTM_MILESTONES.discoveryCallsByWeek4,
      targetLabel: "by week 4",
    },
    { label: "Qualified opportunities", value: qualified.length, hint: "Completed call, 5+ h/week, pilot interest" },
    {
      label: "Proposals sent",
      value: leads.filter((l) => l.status === "proposal_sent" || l.status === "converted").length,
    },
    {
      label: "Deals won",
      value: leads.filter((l) => l.status === "converted").length,
      target: GTM_MILESTONES.pilotsByWeek8.min,
      targetLabel: `${GTM_MILESTONES.pilotsByWeek8.min}–${GTM_MILESTONES.pilotsByWeek8.max} pilots by week 8`,
    },
  ];

  // Revenue = deal value of won deals (entered on the lead when it's signed).
  const revenueNok = leads
    .filter((l) => l.status === "converted")
    .reduce((sum, l) => sum + Number(l.deal_value_nok ?? 0), 0);

  const weekStart = startOfWeek(today);
  const inWeek = (iso: string | null | undefined) => Boolean(iso && iso.slice(0, 10) >= weekStart);
  const weekly = [
    {
      label: "Companies researched",
      value: runs.filter((run) => run.outcome === "researched" && inWeek(run.created_at)).length,
      target: WEEKLY_TARGETS.researched,
    },
    {
      label: "Leads approved",
      value: candidates.filter((c) => c.status === "approved" && inWeek(c.updated_at)).length,
      target: WEEKLY_TARGETS.approved,
    },
    {
      label: "Contacts made",
      value: new Set(
        messages.filter((m) => isSentMessage(m) && inWeek(m.sent_at ?? m.created_at)).map((m) => m.lead_id)
      ).size,
      target: WEEKLY_TARGETS.contacts,
    },
    {
      label: "Discovery calls",
      value: completed.filter((call) => inWeek(call.completed_on)).length,
      target: WEEKLY_TARGETS.discoveryCalls.min,
      targetLabel: `${WEEKLY_TARGETS.discoveryCalls.min}–${WEEKLY_TARGETS.discoveryCalls.max}`,
    },
  ];

  const gate = computeGate(
    perLead.map((call) => ({
      leadId: call.lead_id,
      status: call.status,
      hoursPerWeek: call.hours_per_week,
      problemCategories: call.problem_categories ?? [],
      pilotInterest: call.pilot_interest,
    }))
  );

  // Systems mentioned in completed calls — what an integration must support.
  const systems = new Map<string, number>();
  for (const call of completed) {
    if (call.accounting_system) systems.set(call.accounting_system, (systems.get(call.accounting_system) ?? 0) + 1);
  }

  return { funnel, revenueNok, weekly, weekStart, gate, systems: [...systems.entries()].sort((a, b) => b[1] - a[1]) };
}
