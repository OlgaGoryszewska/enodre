"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Loader2, Mail, Phone, RotateCcw, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bestChannelLabels, leadOpener, segmentLabels, type PotentialCustomer } from "@/lib/potential-customer";
import {
  CONNECTION_NOTE_MAX,
  EMAILABLE_KINDS,
  MESSAGE_CHANNEL_VALUES,
  MESSAGE_KIND_VALUES,
  OPENER_GAP,
  buildMessage,
  defaultChannel,
  messageChannelLabels,
  messageKindLabels,
  type LeadMessage,
  type MessageChannel,
  type MessageKind,
  type MessageLanguage,
} from "@/lib/outreach-templates";
import type { SendEmailInput, SentMessageInput } from "@/app/admin/marketing/outreach-actions";

// The Leads table dispatches this to open the composer on a lead.
export const COMPOSE_LEAD_EVENT = "enodre:compose-lead";

interface MessageComposerProps {
  leads: PotentialCustomer[];
  messages: LeadMessage[];
  onMarkSent: (input: SentMessageInput) => Promise<LeadMessage>;
  onSendEmail: (input: SendEmailInput) => Promise<{ message: LeadMessage | null; to: string; logged: boolean }>;
}

/**
 * True when an address looks like it belongs to the contact person rather than
 * the company. Name parts that are also in the company name are ignored, so
 * augdal@ at Ottar Augdal AS still counts as the company address.
 */
function looksPersonal(email: string, contactName: string, company: string | null) {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const companyName = (company ?? "").toLowerCase();
  return contactName
    .toLowerCase()
    .split(/[\s&.-]+/)
    .some((part) => part.length >= 3 && !companyName.includes(part) && local.includes(part));
}

const selectClass =
  "h-10 w-full rounded-xl border border-black/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function linkedInSearchUrl(lead: PotentialCustomer) {
  const keywords = [lead.name !== lead.company ? lead.name : null, lead.company].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

export function MessageComposer({ leads, messages, onMarkSent, onSendEmail }: MessageComposerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sortedLeads = useMemo(
    () => [...leads].sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name)),
    [leads]
  );

  const [leadId, setLeadId] = useState<string>(sortedLeads[0]?.id ?? "");
  const [kind, setKind] = useState<MessageKind>("first_message");
  const [language, setLanguage] = useState<MessageLanguage>("no");
  const lead = leads.find((candidate) => candidate.id === leadId) ?? null;

  const [draft, setDraft] = useState(() =>
    lead ? buildMessage("first_message", "no", lead) : { subject: null as string | null, body: "" }
  );
  const [channel, setChannel] = useState<MessageChannel>(() =>
    lead ? defaultChannel("first_message", lead) : "linkedin"
  );
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  // Who the email goes to — starts as the lead's saved address, any address can be typed.
  const [recipient, setRecipient] = useState(lead?.email ?? "");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // An email that went out but wasn't logged — recorded with one click, never resent.
  const [unlogged, setUnlogged] = useState<SentMessageInput | null>(null);
  // Messages sent this session, merged with the server's list until it refreshes.
  const [localMessages, setLocalMessages] = useState<LeadMessage[]>([]);

  // A new lead, type or language starts a fresh draft from the template.
  function select(next: { leadId?: string; kind?: MessageKind; language?: MessageLanguage }) {
    const nextLeadId = next.leadId ?? leadId;
    const nextKind = next.kind ?? kind;
    const nextLanguage = next.language ?? language;
    const nextLead = leads.find((candidate) => candidate.id === nextLeadId);
    setLeadId(nextLeadId);
    setKind(nextKind);
    setLanguage(nextLanguage);
    setNotice(null);
    setConfirmingSend(false);
    if (nextLead) {
      setDraft(buildMessage(nextKind, nextLanguage, nextLead));
      setChannel(defaultChannel(nextKind, nextLead));
      if (nextLeadId !== leadId) setRecipient(nextLead.email ?? "");
    }
  }

  useEffect(() => {
    function handleCompose(event: Event) {
      const id = (event as CustomEvent<{ leadId: string }>).detail?.leadId;
      if (!id) return;
      select({ leadId: id, kind: "first_message" });
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener(COMPOSE_LEAD_EVENT, handleCompose);
    return () => window.removeEventListener(COMPOSE_LEAD_EVENT, handleCompose);
  });

  const history = useMemo(() => {
    const byId = new Map<string, LeadMessage>();
    for (const message of [...messages, ...localMessages]) byId.set(message.id, message);
    return [...byId.values()]
      .filter((message) => message.lead_id === leadId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [messages, localMessages, leadId]);

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
        Add potential customers first — the composer drafts messages for them.
      </p>
    );
  }

  const hasOpenerGap = draft.body.includes(OPENER_GAP.no) || draft.body.includes(OPENER_GAP.en);
  const overLimit = kind === "connection_note" && draft.body.length > CONNECTION_NOTE_MAX;
  const canMarkSent = Boolean(lead) && draft.body.trim() !== "" && !hasOpenerGap && !overLimit && !sending;
  const emailable = EMAILABLE_KINDS.includes(kind);
  const to = recipient.trim();
  const validRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
  const canSendEmail = canMarkSent && emailable && validRecipient && Boolean(draft.subject?.trim());
  // Why Send is unavailable, in plain words — shown under the button.
  const sendBlocker = !emailable
    ? kind === "phone_opener"
      ? "Use this on the call, then log it with Mark as sent."
      : "Send this on LinkedIn, then log it with Mark as sent."
    : !to
      ? "Type an email address to send to — a company address (post@, kontakt@) — or send it on LinkedIn and log it with Mark as sent."
      : !validRecipient
        ? "That email address doesn't look complete."
        : hasOpenerGap
          ? "Write the opener line first."
          : !draft.subject?.trim()
            ? "Add a subject."
            : null;
  const personalAddress = Boolean(
    lead && validRecipient && lead.name !== lead.company && looksPersonal(to, lead.name, lead.company)
  );

  async function copy() {
    // The subject only belongs in the copy for an email; LinkedIn has no subject.
    const text = kind === "email" && draft.subject ? `${draft.subject}\n\n${draft.body}` : draft.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice({ kind: "error", text: "Couldn't copy — select the text and copy it manually." });
    }
  }

  async function markSent() {
    if (!lead) return;
    setSending(true);
    setNotice(null);
    try {
      const saved = await onMarkSent({
        leadId: lead.id,
        kind,
        channel,
        language,
        subject: draft.subject,
        body: draft.body,
      });
      setLocalMessages((current) => [...current, saved]);
      setNotice({ kind: "ok", text: "Logged. The lead is marked as contacted and the follow-up clock has started." });
    } catch {
      setNotice({ kind: "error", text: "Couldn't log the message. Is lead_messages.sql run in Supabase?" });
    } finally {
      setSending(false);
    }
  }

  async function sendEmail() {
    if (!lead) return;
    setSending(true);
    setNotice(null);
    try {
      const result = await onSendEmail({
        leadId: lead.id,
        kind,
        language,
        to,
        subject: draft.subject ?? "",
        body: draft.body,
      });
      if (result.message) {
        const saved = result.message;
        setLocalMessages((current) => [...current, saved]);
      } else {
        setUnlogged({
          leadId: lead.id,
          kind,
          channel: "email",
          language,
          subject: draft.subject,
          body: draft.body,
          recipient: result.to,
        });
      }
      setNotice(
        result.logged
          ? { kind: "ok", text: `Sent to ${result.to} and logged. The follow-up clock has started.` }
          : {
              kind: "error",
              text: `Sent to ${result.to}, but it couldn't be logged. Don't send it again — log it below instead.`,
            }
      );
    } catch {
      setNotice({
        kind: "error",
        text: "Not sent. Check the email setup (GMAIL_USER / GMAIL_APP_PASSWORD) and try again.",
      });
    } finally {
      setSending(false);
      setConfirmingSend(false);
    }
  }

  const opener = lead ? leadOpener(lead) : { fact: null, source: null };

  const mailto =
    lead?.email &&
    `mailto:${lead.email}?subject=${encodeURIComponent(draft.subject ?? "")}&body=${encodeURIComponent(draft.body)}`;

  return (
    <div ref={rootRef} className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Editor */}
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">To</span>
            <select className={selectClass} value={leadId} onChange={(event) => select({ leadId: event.target.value })}>
              {sortedLeads.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.company ? `${candidate.company} — ${candidate.name}` : candidate.name}
                  {candidate.responded ? " (replied)" : candidate.first_contacted_on ? " (contacted)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">Language</span>
            <div className="flex rounded-full border border-black/10 bg-black/[0.03] p-1">
              {(["no", "en"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => select({ language: value })}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                    language === value ? "bg-background text-foreground shadow-sm" : "text-ink-muted"
                  )}
                >
                  {value === "no" ? "Norsk" : "English"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {MESSAGE_KIND_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => select({ kind: value })}
              aria-pressed={kind === value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                kind === value
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/10 text-foreground hover:border-black/30"
              )}
            >
              {messageKindLabels[value]}
            </button>
          ))}
        </div>

        {draft.subject !== null && (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">
              Subject
              {kind === "email" ? "" : <span className="font-normal text-ink-muted"> · used if you send by email</span>}
            </span>
            <Input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          </label>
        )}

        <label className="grid gap-1.5 text-sm">
          <span className="flex items-baseline justify-between gap-2 font-medium">
            Message
            <span className={cn("text-xs font-normal", overLimit ? "font-semibold text-danger" : "text-ink-muted")}>
              {draft.body.length}
              {kind === "connection_note" && ` / ${CONNECTION_NOTE_MAX}`} characters
            </span>
          </span>
          <Textarea
            rows={kind === "first_message" || kind === "email" ? 14 : 5}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            className="leading-6"
          />
        </label>

        {hasOpenerGap && (
          <p className="flex items-start gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            Replace the bracketed line with one specific, true thing about them — use the opener fact on the right and
            check it against its source.
          </p>
        )}
        {overLimit && (
          <p className="text-sm text-danger">
            LinkedIn connection notes are limited to {CONNECTION_NOTE_MAX} characters.
          </p>
        )}

        {/* Send */}
        <div className="grid gap-3 rounded-xl border border-black/10 bg-background p-4">
          {emailable && (
            <label className="grid gap-1.5 text-sm">
              <span className="flex flex-wrap items-baseline justify-between gap-2 font-medium">
                To
                {lead?.email && to !== lead.email && (
                  <button
                    type="button"
                    onClick={() => setRecipient(lead.email ?? "")}
                    className="text-xs font-semibold text-ink-muted hover:text-foreground"
                  >
                    Use saved address ({lead.email})
                  </button>
                )}
              </span>
              <Input
                type="email"
                value={recipient}
                placeholder="post@company.no"
                onChange={(event) => {
                  setRecipient(event.target.value);
                  setConfirmingSend(false);
                }}
              />
              {!lead?.email && validRecipient && (
                <span className="text-xs text-ink-muted">This lead has no saved email — sending saves this one.</span>
              )}
            </label>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmingSend(true)}
              disabled={!canSendEmail || confirmingSend}
              className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-5 py-2.5 text-sm")}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {validRecipient && emailable ? `Send email to ${to}` : "Send email"}
            </button>
            {sendBlocker && <p className="text-sm text-ink-muted">{sendBlocker}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
            <button
              type="button"
              onClick={() => void copy()}
              className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            {lead && (
              <button
                type="button"
                onClick={() => select({})}
                className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-ink-muted hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset to template
              </button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                Sent it yourself via
                <select
                  value={channel}
                  onChange={(event) => setChannel(event.target.value as MessageChannel)}
                  className="h-9 rounded-full border border-black/10 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {MESSAGE_CHANNEL_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {messageChannelLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void markSent()}
                disabled={!canMarkSent}
                title="Log a message you sent yourself (LinkedIn, phone, your own email)"
                className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                Mark as sent
              </button>
            </div>
          </div>
        </div>
        {confirmingSend && validRecipient && (
          <div
            role="alertdialog"
            aria-label="Confirm sending"
            className="grid gap-3 rounded-xl border border-foreground/30 bg-background p-4 text-sm"
          >
            <p>
              Send this email to <span className="font-semibold">{to}</span> now? It goes out from the site&apos;s Gmail
              account; replies go to info@enodre.com.
            </p>
            {personalAddress && (
              <p className="flex items-start gap-2 font-semibold text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                This looks like a personal address. Unsolicited marketing to a named person&apos;s email isn&apos;t
                allowed (markedsføringsloven §15) — use their company address or LinkedIn instead.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sendEmail()}
                disabled={sending}
                className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {sending ? "Sending..." : "Send now"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingSend(false)}
                disabled={sending}
                className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {notice && (
          <p className={cn("text-sm", notice.kind === "ok" ? "text-ink-muted" : "text-danger")} role="status">
            {notice.text}
          </p>
        )}
        {unlogged && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
            <p className="flex-1">
              The email to <span className="font-semibold">{unlogged.recipient}</span> was sent. Log it now — this
              records it without sending anything.
            </p>
            <button
              type="button"
              disabled={sending}
              onClick={async () => {
                setSending(true);
                try {
                  const saved = await onMarkSent(unlogged);
                  setLocalMessages((current) => [...current, saved]);
                  setUnlogged(null);
                  setNotice({ kind: "ok", text: "Logged. The follow-up date is set." });
                } catch {
                  setNotice({
                    kind: "error",
                    text: "Still couldn't log it. Run the latest SQL files in Supabase, then try again.",
                  });
                } finally {
                  setSending(false);
                }
              }}
              className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Log the sent email
            </button>
          </div>
        )}
      </div>

      {/* Reference panel */}
      {lead && (
        <aside className="grid content-start gap-4 rounded-xl border border-black/10 bg-background p-4 text-sm">
          <div>
            <p className="font-semibold">{lead.company || lead.name}</p>
            <p className="text-xs text-ink-muted">
              {[
                lead.name !== lead.company ? lead.name : null,
                lead.location,
                lead.employees != null && `${lead.employees} empl.`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {lead.segment && <p className="mt-1 text-xs text-ink-muted">{segmentLabels[lead.segment]}</p>}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Opener fact</p>
            {opener.fact ? (
              <>
                <p className="mt-1 leading-6">{opener.fact}</p>
                {opener.source && (
                  <a
                    href={opener.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    Check the source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </>
            ) : (
              <p className="mt-1 text-ink-muted">
                None yet — add one in the lead&apos;s Details, or research them first.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Reach them{lead.best_channel ? ` · best: ${bestChannelLabels[lead.best_channel]}` : ""}
            </p>
            <a
              href={linkedInSearchUrl(lead)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Find on LinkedIn
            </a>
            {mailto && (
              <a href={mailto} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email {lead.email}
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 font-semibold hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call {lead.phone}
              </a>
            )}
            {mailto && (
              <p className="text-xs text-ink-muted">
                Email only to company addresses (post@, kontakt@) — markedsføringsloven §15.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sent so far</p>
            {history.length === 0 ? (
              <p className="mt-1 text-ink-muted">Nothing yet.</p>
            ) : (
              <ul className="mt-1 grid gap-1.5">
                {history.map((message) => (
                  <li key={message.id}>
                    <details>
                      <summary className="cursor-pointer">
                        {formatDateTime(message.created_at)} · {messageKindLabels[message.kind]} ·{" "}
                        {messageChannelLabels[message.channel]}
                        {message.recipient ? ` · to ${message.recipient}` : ""}
                      </summary>
                      <p className="mt-1 whitespace-pre-line rounded-lg bg-black/[0.03] p-2 text-xs leading-5">
                        {message.subject ? `${message.subject}\n\n` : ""}
                        {message.body}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
