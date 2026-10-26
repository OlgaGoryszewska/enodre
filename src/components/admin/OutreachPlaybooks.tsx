import {
  INDUSTRY_VALUES,
  PLAYBOOKS,
  RESPONSE_LABELS,
  RESPONSE_REPLIES,
  type ResponseType,
} from "@/lib/industry-playbooks";

/** Reference: the outreach strategy for each target industry (all hypotheses). */
export function OutreachPlaybooks() {
  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Outreach playbooks</h2>
      <p className="mt-1 text-sm text-ink-muted">
        How companies in each industry usually work, where manual work tends to hide, and what to ask. These are
        hypotheses — a discovery call finds out what&apos;s true for each company. The composer uses the lead&apos;s
        industry.
      </p>
      <div className="mt-5 grid gap-2">
        {INDUSTRY_VALUES.filter((industry) => industry !== "other").map((industry) => {
          const playbook = PLAYBOOKS[industry];
          return (
            <details key={industry} className="rounded-xl border border-black/10 bg-background p-4 text-sm">
              <summary className="cursor-pointer font-semibold">{playbook.label}</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Typical workflow</p>
                  <p className="mt-1">{playbook.workflow.join(" → ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Manual tasks</p>
                  <p className="mt-1 text-ink-muted">{playbook.manualTasks.join(" · ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Likely bottlenecks</p>
                  <p className="mt-1 text-ink-muted">{playbook.bottlenecks.join(" · ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Automation opportunities
                  </p>
                  <p className="mt-1 text-ink-muted">{playbook.automation.join(" · ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Questions that uncover the problem
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {playbook.discoveryQuestions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Signals worth researching
                  </p>
                  <p className="mt-1 text-ink-muted">{playbook.signals.join(" · ")}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Opening questions (first message)
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {playbook.openingQuestions.map((q) => (
                      <li key={q.no}>{q.no}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    <span className="font-medium">Value line: </span>
                    <span className="text-ink-muted">{playbook.value.no}</span>
                  </p>
                </div>
              </div>
            </details>
          );
        })}
        <details className="rounded-xl border border-black/10 bg-background p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Replies by response (all industries)</summary>
          <ul className="mt-3 grid gap-2">
            {(Object.keys(RESPONSE_LABELS) as ResponseType[]).map((type) => (
              <li key={type}>
                <span className="font-medium">{RESPONSE_LABELS[type]}:</span>{" "}
                <span className="text-ink-muted">{RESPONSE_REPLIES[type]}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
