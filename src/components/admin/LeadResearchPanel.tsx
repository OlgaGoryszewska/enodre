"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PotentialCustomer } from "@/lib/potential-customer";
import { PLAYBOOKS, RESPONSE_LABELS, responseLabel, responseReply, type ResponseType } from "@/lib/industry-playbooks";
import { leadIndustry } from "@/lib/outreach-templates";

const UNKNOWN = <span className="text-ink-muted">Unknown</span>;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-1 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Heading({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
      {children}
      {note && <span className="ml-2 normal-case tracking-normal">{note}</span>}
    </p>
  );
}

/** Prospect research: verified facts (with sources) kept apart from hypotheses. */
export function LeadResearchPanel({
  lead,
  onAddFact,
  onRemoveFact,
}: {
  lead: PotentialCustomer;
  onAddFact: (leadId: string, input: { fact: string; source_url: string }) => Promise<void>;
  onRemoveFact: (leadId: string, index: number) => Promise<void>;
}) {
  const [fact, setFact] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const research = lead.research ?? null;
  const industry = leadIndustry(lead);
  const playbook = PLAYBOOKS[industry];
  const facts = research?.facts ?? [];
  const supported = lead.research !== undefined;

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Research</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Verified facts have a source. Everything under “Assumptions” is a hypothesis to check on a call — never state
          it as fact in a message.
        </p>
      </div>

      <dl>
        <Row label="Company">{lead.company || lead.name}</Row>
        <Row label="Website">
          {lead.website ? (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {lead.website.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            UNKNOWN
          )}
        </Row>
        <Row label="Industry">{lead.industry ? playbook.label : UNKNOWN}</Row>
        <Row label="Size">{lead.employees != null ? `${lead.employees} employees (register)` : UNKNOWN}</Row>
        <Row label="Services">{research?.summary || UNKNOWN}</Row>
        <Row label="Confidence">{research?.confidence ?? UNKNOWN}</Row>
        <Row label="Researched">
          {research?.researched_at ? new Date(research.researched_at).toLocaleDateString("en-GB") : UNKNOWN}
        </Row>
      </dl>

      <div className="grid gap-2">
        <Heading>Verified facts</Heading>
        {facts.length === 0 ? (
          <p className="text-sm text-ink-muted">
            None yet. Add one you&apos;ve checked, with the link where you found it.
          </p>
        ) : (
          <ul className="grid gap-2">
            {facts.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="flex-1">
                  {item.fact}{" "}
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
                  >
                    source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </span>
                {supported && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Remove fact"
                    onClick={() => void run(() => onRemoveFact(lead.id, index))}
                    className="rounded-full p-1 text-ink-muted hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {supported ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="A fact you've verified" value={fact} onChange={(e) => setFact(e.target.value)} />
            <Input
              placeholder="https:// — where you found it"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !fact.trim() || !source.trim()}
              onClick={() =>
                void run(async () => {
                  await onAddFact(lead.id, { fact, source_url: source });
                  setFact("");
                  setSource("");
                })
              }
              className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              Add
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Run outreach_system.sql in Supabase to add facts here.</p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {(research?.signals?.length ?? 0) > 0 && (
        <div className="grid gap-2">
          <Heading>Growth and change signals</Heading>
          <ul className="grid gap-1.5 text-sm">
            {research!.signals!.map((item, index) => (
              <li key={index}>
                {item.signal}{" "}
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold hover:underline"
                >
                  source
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-dashed border-black/15 p-4">
        <Heading note="— not confirmed for this company">Assumptions</Heading>
        <dl>
          <Row label="Likely problem">{research?.likely_pain || UNKNOWN}</Row>
          <Row label="Why we think so">{research?.pain_evidence || UNKNOWN}</Row>
          <Row label="How we'd help">{research?.how_we_help || UNKNOWN}</Row>
          <Row label="Typical workflow">{playbook.workflow.join(" → ")}</Row>
          <Row label="Automation ideas">{playbook.automation.join("; ")}</Row>
        </dl>
        <p className="text-sm">
          <span className="font-semibold">Suggested outreach angle: </span>
          {playbook.openingQuestions[0].no}
        </p>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Industry playbook: {playbook.label}</summary>
        <div className="mt-3 grid gap-4">
          <div>
            <Heading>Questions for the discovery call</Heading>
            <ul className="mt-1 list-disc pl-5">
              {playbook.discoveryQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
          <div>
            <Heading>Worth researching</Heading>
            <p className="mt-1 text-ink-muted">{playbook.signals.join(" · ")}</p>
          </div>
          <div>
            <Heading>Common manual work and bottlenecks (hypotheses)</Heading>
            <p className="mt-1 text-ink-muted">{[...playbook.manualTasks, ...playbook.bottlenecks].join(" · ")}</p>
          </div>
          <div>
            <Heading>If they reply…</Heading>
            <ul className="mt-1 grid gap-2">
              {(Object.keys(RESPONSE_LABELS) as ResponseType[]).map((type) => (
                <li key={type}>
                  <span className="font-medium">{responseLabel(industry, type)}:</span>{" "}
                  <span className="text-ink-muted">{responseReply(industry, type)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
