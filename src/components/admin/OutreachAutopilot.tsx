"use client";

import { useState } from "react";
import { AlertCircle, Eye, Loader2, Rocket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTOPILOT } from "@/lib/outreach-autopilot";
import type { AutopilotItem, AutopilotResult } from "@/app/admin/marketing/autopilot-actions";

const RESULT_LABELS: Record<AutopilotItem["result"], string> = {
  sent: "Sent",
  would_send: "Would send",
  added: "Done",
  would_add: "Will do",
  skipped: "Skipped",
  failed: "Failed",
};

const RESULT_STYLES: Record<AutopilotItem["result"], string> = {
  sent: "bg-[#E3F3E6] text-[#1B8A3A]",
  would_send: "bg-[#E3F3E6] text-[#1B8A3A]",
  added: "bg-accent/10 text-accent",
  would_add: "bg-accent/10 text-accent",
  skipped: "bg-black/5 text-ink-muted",
  failed: "bg-danger/10 text-danger",
};

/** One button for the whole outreach routine — preview first, then run. */
export function OutreachAutopilot({
  onRun,
  senderAddress,
}: {
  onRun: (input: { dryRun: boolean; findNew: boolean }) => Promise<AutopilotResult>;
  senderAddress: string | null;
}) {
  const [findNew, setFindNew] = useState(true);
  const [busy, setBusy] = useState<"preview" | "run" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<AutopilotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  async function run(dryRun: boolean) {
    setBusy(dryRun ? "preview" : "run");
    setConfirming(false);
    setError(null);
    try {
      setResult(await onRun({ dryRun, findNew }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const items = result?.items ?? [];
  const main = items.filter((item) => item.result !== "skipped");
  const skipped = items.filter((item) => item.result === "skipped");
  const wouldSend = items.filter((item) => item.result === "would_send").length;

  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight">Run outreach</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Does the routine in one go: finds companies hiring developers/designers, adds them as leads (with email
            search), writes each due email from the template, checks it and sends it from{" "}
            <span className="font-medium text-foreground">{senderAddress ?? "the site's mail account"}</span>.
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-ink-muted">
            <li>
              Up to {AUTOPILOT.newPerDay} new companies a day, plus due follow-ups (after 4 working days, then a final
              one 5 later). Replies you record stop the sequence.
            </li>
            <li>
              Only messages with no quality notes, to a general company address (post@, kontakt@…), Norway only.
              Anything else is listed for you to do by hand.
            </li>
            <li>Messages you approved yourself go exactly as approved; unfinished drafts are left alone.</li>
            <li>
              Preview sends nothing, but does look up and save company email addresses for new leads, so it shows what
              would really go out.
            </li>
          </ul>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={findNew} onChange={(event) => setFindNew(event.target.checked)} />
          Search for new companies first (about a minute)
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run(true)}
          disabled={busy !== null}
          className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
        >
          {busy === "preview" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          Preview (sends nothing)
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy !== null}
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
          >
            {busy === "run" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Rocket className="h-4 w-4" aria-hidden="true" />
            )}
            {busy === "run" ? "Running — up to 4 minutes…" : "Run outreach"}
          </button>
        ) : (
          <div role="alertdialog" aria-label="Confirm run" className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Send real emails now?</span>
            <button
              type="button"
              onClick={() => void run(false)}
              className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
            >
              Yes, run and send
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 grid gap-3">
          <p className="text-sm">
            {result.dryRun ? (
              <>
                <span className="font-semibold">Preview:</span> {wouldSend} email{wouldSend === 1 ? "" : "s"} would go
                out now.
                {result.found === null && findNew && " (The search for new companies only runs on a real run.)"}
              </>
            ) : (
              <>
                <span className="font-semibold">
                  Sent {result.sentNew} first message{result.sentNew === 1 ? "" : "s"} and {result.sentFollowUps}{" "}
                  follow-up{result.sentFollowUps === 1 ? "" : "s"}.
                </span>
                {result.found && ` Hiring search: ${result.found.added} new of ${result.found.employers} companies.`}
              </>
            )}{" "}
            <span className="text-ink-muted">
              {result.newSentBefore > 0 &&
                `${result.newSentBefore} first email${result.newSentBefore === 1 ? " was" : "s were"} already sent today. `}
              {result.newLeftToday} new compan{result.newLeftToday === 1 ? "y" : "ies"} left today (limit{" "}
              {AUTOPILOT.newPerDay}).
            </span>
          </p>
          {result.stopped && <p className="text-sm font-semibold text-danger">{result.stopped}</p>}
          {main.length > 0 && <ItemList items={main} />}
          {skipped.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Why skipped</p>
              <ul className="mb-2 grid gap-0.5 text-sm">
                {skipReasons(skipped).map(([reason, count]) => (
                  <li key={reason}>
                    <span className="font-semibold tabular-nums">{count}×</span> {reason}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setShowSkipped((current) => !current)}
                className="text-sm font-semibold text-ink-muted hover:text-foreground"
              >
                {showSkipped ? "Hide" : "Show"} {skipped.length} skipped (need you or not due)
              </button>
              {showSkipped && <ItemList items={skipped} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Skip reasons with counts, most common first ("Needs you: …" details grouped by their first note). */
function skipReasons(items: AutopilotItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const reason = item.detail.startsWith("Needs you:") ? item.detail.split(";")[0] : item.detail;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function ItemList({ items }: { items: AutopilotItem[] }) {
  return (
    <ul className="mt-2 grid gap-1.5">
      {items.map((item, index) => (
        <li
          key={`${item.leadId ?? item.company}-${item.step}-${index}`}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-black/10 bg-background px-3 py-2 text-sm"
        >
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", RESULT_STYLES[item.result])}>
            {RESULT_LABELS[item.result]}
          </span>
          {item.leadId ? (
            <a href={`/admin/marketing/leads/${item.leadId}`} className="font-medium hover:underline">
              {item.company}
            </a>
          ) : (
            <span className="font-medium">{item.company}</span>
          )}
          <span className="text-xs text-ink-muted">{item.step}</span>
          <span className="min-w-0 flex-1 text-xs text-ink-muted">{item.detail}</span>
        </li>
      ))}
    </ul>
  );
}
