"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { Accordion } from "@/components/admin/Accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { companyPath } from "@/lib/application-search";
import type { ReplyCheckResult } from "@/lib/reply-check";

export type EmailReply = {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  snippet: string | null;
  is_auto: boolean;
  lead_id: string | null;
  company_key: string | null;
  company: string | null;
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  });

/** Replies found in the inbox from people we wrote to, with a button to check now. */
export function EmailReplies({
  title,
  inbox,
  replies,
  setupMissing,
  onCheck,
  onSetAutomatic,
}: {
  title: string;
  inbox: string;
  replies: EmailReply[];
  setupMissing: boolean;
  onCheck: () => Promise<{ ok: true; result: ReplyCheckResult } | { ok: false; error: string }>;
  onSetAutomatic: (id: string, isAuto: boolean) => Promise<{ ok: boolean; error: string | null }>;
}) {
  // Your choices, shown at once while the page catches up.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function setAutomatic(id: string, isAuto: boolean) {
    setSavingId(id);
    setError(null);
    setOverrides((current) => ({ ...current, [id]: isAuto }));
    const result = await onSetAutomatic(id, isAuto).catch(() => ({ ok: false, error: "Couldn't save." }));
    if (!result.ok) {
      setOverrides((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setError(result.error ?? "Couldn't save.");
    }
    setSavingId(null);
  }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAuto, setShowAuto] = useState(false);
  const withOverrides = replies.map((reply) =>
    reply.id in overrides ? { ...reply, is_auto: overrides[reply.id] } : reply
  );
  const people = withOverrides.filter((reply) => !reply.is_auto);
  const shown = showAuto ? withOverrides : people;

  async function check() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const checked = await onCheck();
      if (!checked.ok) {
        setError(checked.error);
        return;
      }
      const { result } = checked;
      const rechecked = result.reclassified
        ? ` ${result.reclassified} earlier ${result.reclassified === 1 ? "one was" : "ones were"} re-checked: automatic replies don't count.`
        : "";
      setMessage(
        (result.saved === 0
          ? "No new replies."
          : `${result.saved} new repl${result.saved === 1 ? "y" : "ies"}, ${result.people} from a person.`) + rechecked
      );
      setProblems(result.problems);
    } catch {
      setError("Couldn't check replies. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Accordion
      icon={<Inbox className="h-4 w-4" aria-hidden="true" />}
      title={`${title} (${people.length})`}
      subtitle={`Answers in ${inbox} from people we wrote to, checked every morning`}
      keepMounted
    >
      {setupMissing ? (
        <p className="text-sm text-ink-muted">
          Run supabase/email_replies.sql in the Supabase SQL Editor to switch it on.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void check()}
              disabled={busy}
              className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? "Reading the inboxes…" : "Check replies"}
            </button>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input type="checkbox" checked={showAuto} onChange={(event) => setShowAuto(event.target.checked)} />
              Show automatic replies ({replies.length - people.length})
            </label>
            {message && <span className="text-sm text-ink-muted">{message}</span>}
            {error && <span className="text-sm font-semibold text-danger">{error}</span>}
          </div>
          {problems.length > 0 && (
            <ul className="mt-3 grid gap-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-muted">
            Only a reply a person wrote counts: out-of-office, “we received your application” and template rejections
            are marked Automatic and change nothing. A real reply stops follow-ups to that lead, and moves a contacted
            recruiter or company to Replied.
          </p>

          {shown.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
              No replies yet.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {shown.map((reply) => {
                const href = reply.lead_id
                  ? `/admin/marketing/leads/${reply.lead_id}`
                  : reply.company_key
                    ? companyPath(reply.company_key)
                    : null;
                return (
                  <li key={reply.id} className="rounded-xl border border-black/10 bg-background p-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {href ? (
                        <Link href={href} className="font-semibold hover:underline">
                          {reply.company ?? reply.from_email}
                        </Link>
                      ) : (
                        <span className="font-semibold">{reply.company ?? reply.from_email}</span>
                      )}
                      <span className="text-xs text-ink-muted">
                        {[reply.from_name, reply.from_email].filter(Boolean).join(" · ")}
                      </span>
                      {reply.is_auto && (
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold">Automatic</span>
                      )}
                      <span className="ml-auto text-xs text-ink-muted">{dateTime(reply.received_at)}</span>
                      <button
                        type="button"
                        disabled={savingId === reply.id}
                        onClick={() => void setAutomatic(reply.id, !reply.is_auto)}
                        className="text-xs font-semibold text-ink-muted hover:text-foreground"
                      >
                        {reply.is_auto ? "Count as real" : "Not a real reply"}
                      </button>
                    </div>
                    {reply.subject && <p className="mt-1 text-xs font-medium">{reply.subject}</p>}
                    {reply.snippet && (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ink-muted">{reply.snippet}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Accordion>
  );
}
