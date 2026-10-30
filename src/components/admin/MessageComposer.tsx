"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  bestChannelLabels,
  followUpDate,
  needsConsentFirst,
  segmentLabels,
  type PotentialCustomer,
} from "@/lib/potential-customer";
import {
  CONNECTION_NOTE_MAX,
  EMAILABLE_KINDS,
  leadLanguage,
  MESSAGE_CHANNEL_VALUES,
  MESSAGE_KIND_VALUES,
  OPENER_GAP,
  buildMessage,
  defaultChannel,
  isSentMessage,
  leadIndustry,
  messageChannelLabels,
  messageKindLabels,
  verifiedFacts,
  type LeadMessage,
  type MessageChannel,
  type MessageKind,
  type MessageLanguage,
} from "@/lib/outreach-templates";
import { PLAYBOOKS, RESPONSE_LABELS, responseLabel, responseReply, type ResponseType } from "@/lib/industry-playbooks";
import { checkMessage, isReady } from "@/lib/message-quality";
import type { DraftInput, SendEmailInput, SentMessageInput } from "@/app/admin/marketing/outreach-actions";
import type { GenerateDraftResult, GenerateOpenerResult } from "@/app/admin/marketing/outreach-ai-actions";
import type { FindEmailResult } from "@/app/admin/marketing/outreach-actions";

// The Leads table dispatches this to open the composer on a lead.
export const COMPOSE_LEAD_EVENT = "enodre:compose-lead";

export interface MessageComposerProps {
  leads: PotentialCustomer[];
  messages: LeadMessage[];
  onMarkSent: (input: SentMessageInput) => Promise<LeadMessage>;
  onSendEmail: (input: SendEmailInput) => Promise<{ message: LeadMessage | null; to: string; logged: boolean }>;
  onSaveDraft: (input: DraftInput) => Promise<LeadMessage>;
  onApprove: (input: DraftInput) => Promise<LeadMessage>;
  onGenerate: (input: { leadId: string; kind: MessageKind; language: MessageLanguage }) => Promise<GenerateDraftResult>;
  onRecordResponse: (leadId: string, response: ResponseType) => Promise<void>;
  onStopSequence: (leadId: string, reason: "declined" | "do_not_contact" | "paused") => Promise<void>;
  onGenerateOpener: (leadId: string) => Promise<GenerateOpenerResult>;
  onFindEmail: (leadId: string) => Promise<FindEmailResult>;
  onSaveEmail: (leadId: string, email: string) => Promise<void>;
  /** The address emails go out from (null when sending isn't set up). */
  senderAddress?: string | null;
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

function formatDay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function linkedInSearchUrl(lead: PotentialCustomer) {
  const keywords = [lead.name !== lead.company ? lead.name : null, lead.company].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

const FIRST_CONTACT_KINDS: MessageKind[] = ["connection_note", "first_message", "email", "phone_opener"];

/** Where the lead is in the sequence: first contact → follow-up → final follow-up. */
function sequenceState(lead: PotentialCustomer, sent: LeadMessage[]) {
  const first = sent.find((m) => FIRST_CONTACT_KINDS.includes(m.kind));
  const follow = sent.find((m) => m.kind === "follow_up");
  const final = sent.find((m) => m.kind === "final_follow_up");
  const stopped =
    lead.do_not_contact || lead.responded || lead.status === "not_interested" || lead.status === "converted";
  const next: MessageKind = !first ? "first_message" : !follow ? "follow_up" : !final ? "final_follow_up" : "follow_up";
  return { first, follow, final, stopped, next, done: Boolean(final) };
}

export function MessageComposer({
  leads,
  messages,
  onMarkSent,
  onSendEmail,
  onSaveDraft,
  onApprove,
  onGenerate,
  onRecordResponse,
  onStopSequence,
  onGenerateOpener,
  senderAddress,
  onFindEmail,
  onSaveEmail,
}: MessageComposerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sortedLeads = useMemo(
    () => [...leads].sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name)),
    [leads]
  );
  // Messages saved this session, merged with the server's list until it refreshes.
  const [localMessages, setLocalMessages] = useState<LeadMessage[]>([]);
  const allMessages = useMemo(() => {
    const byId = new Map<string, LeadMessage>();
    for (const message of [...messages, ...localMessages]) byId.set(message.id, message);
    return [...byId.values()];
  }, [messages, localMessages]);

  const [leadId, setLeadId] = useState<string>(sortedLeads[0]?.id ?? "");
  const leadIdRef = useRef(leadId);
  const lead = leads.find((candidate) => candidate.id === leadId) ?? null;
  const leadMessages = allMessages.filter((m) => m.lead_id === leadId);
  const sent = leadMessages.filter(isSentMessage).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const sequence = lead ? sequenceState(lead, sent) : null;

  const openDraftFor = (id: string, k: MessageKind) =>
    allMessages.find((m) => m.lead_id === id && m.kind === k && (m.status === "draft" || m.status === "approved")) ??
    null;

  const initialKind: MessageKind = lead
    ? sequenceState(
        lead,
        allMessages.filter((m) => m.lead_id === lead.id && isSentMessage(m))
      ).next
    : "first_message";
  const [kind, setKind] = useState<MessageKind>(initialKind);
  const [language, setLanguage] = useState<MessageLanguage>(lead ? leadLanguage(lead) : "no");
  const languageRef = useRef(language);
  // Kept current for the opener callback, which resolves after later renders.
  useEffect(() => {
    leadIdRef.current = leadId;
    languageRef.current = language;
  }, [leadId, language]);
  const [draft, setDraft] = useState(() => {
    if (!lead) return { subject: null as string | null, body: "" };
    const saved = openDraftFor(lead.id, initialKind);
    return saved ? { subject: saved.subject, body: saved.body } : buildMessage(initialKind, leadLanguage(lead), lead);
  });
  const [channel, setChannel] = useState<MessageChannel>(() => (lead ? defaultChannel(initialKind, lead) : "linkedin"));
  const [busy, setBusy] = useState<"save" | "approve" | "generate" | "send" | "log" | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [recipient, setRecipient] = useState(lead?.email ?? "");
  // Email lookup / save for the lead shown — cleared when the lead changes.
  const [emailLookup, setEmailLookup] = useState<{
    leadId: string;
    busy: "find" | "save" | null;
    found?: FindEmailResult["found"];
    message?: string;
    error?: string;
  } | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [unlogged, setUnlogged] = useState<SentMessageInput | null>(null);
  const [replyType, setReplyType] = useState<ResponseType | null>(null);
  // Automatic opening line: one attempt per lead per visit; results by lead.
  const openerAttempts = useRef(new Set<string>());
  const [openers, setOpeners] = useState<
    Record<string, { ok: true; no: string; en: string; fact: string } | { ok: false; error: string }>
  >({});

  // A new lead, type or language loads its saved draft, or a fresh template.
  function select(next: { leadId?: string; kind?: MessageKind; language?: MessageLanguage; fresh?: boolean }) {
    const nextLeadId = next.leadId ?? leadId;
    const nextLead = leads.find((candidate) => candidate.id === nextLeadId);
    const nextKind =
      next.kind ??
      (next.leadId && nextLead
        ? sequenceState(
            nextLead,
            allMessages.filter((m) => m.lead_id === nextLead.id && isSentMessage(m))
          ).next
        : kind);
    const nextLanguage =
      next.language ?? (next.leadId && nextLead && next.leadId !== leadId ? leadLanguage(nextLead) : language);
    setLeadId(nextLeadId);
    setKind(nextKind);
    setLanguage(nextLanguage);
    setNotice(null);
    setConfirmingSend(false);
    setReplyType(null);
    if (nextLead) {
      const saved = next.fresh ? null : openDraftFor(nextLead.id, nextKind);
      const built = buildMessage(nextKind, nextLanguage, nextLead);
      const local = openers[nextLead.id];
      if (local?.ok)
        built.body = built.body.replace(OPENER_GAP[nextLanguage], nextLanguage === "no" ? local.no : local.en);
      setDraft(saved ? { subject: saved.subject, body: saved.body } : built);
      setChannel(defaultChannel(nextKind, nextLead));
      if (nextLeadId !== leadId) setRecipient(nextLead.email ?? "");
    }
  }

  useEffect(() => {
    function handleCompose(event: Event) {
      const id = (event as CustomEvent<{ leadId: string }>).detail?.leadId;
      if (!id) return;
      select({ leadId: id });
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener(COMPOSE_LEAD_EVENT, handleCompose);
    return () => window.removeEventListener(COMPOSE_LEAD_EVENT, handleCompose);
  });

  // Fill the opening automatically when the draft still has the placeholder
  // and the lead has verified facts. State is only set when the call returns.
  const needsOpener = Boolean(lead && draft.body.includes(OPENER_GAP[language]) && verifiedFacts(lead).length > 0);
  useEffect(() => {
    if (!lead || !needsOpener || openerAttempts.current.has(lead.id)) return;
    openerAttempts.current.add(lead.id);
    const id = lead.id;
    onGenerateOpener(id).then(
      (result) => {
        if (result.ok) {
          setOpeners((current) => ({
            ...current,
            [id]: { ok: true, no: result.opener_no, en: result.opener_en, fact: result.fact },
          }));
          // Fill it in only if this lead's draft still has the placeholder.
          setDraft((current) =>
            leadIdRef.current === id && current.body.includes(OPENER_GAP[languageRef.current])
              ? {
                  ...current,
                  body: current.body.replace(
                    OPENER_GAP[languageRef.current],
                    languageRef.current === "no" ? result.opener_no : result.opener_en
                  ),
                }
              : current
          );
        } else {
          setOpeners((current) => ({ ...current, [id]: { ok: false, error: result.error } }));
        }
      },
      () =>
        setOpeners((current) => ({ ...current, [id]: { ok: false, error: "Couldn't write the opening right now." } }))
    );
  }, [lead, needsOpener, onGenerateOpener]);

  if (leads.length === 0 || !lead || !sequence) {
    return (
      <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
        Add potential customers first — the composer drafts messages for them.
      </p>
    );
  }

  const facts = verifiedFacts(lead);
  const industry = leadIndustry(lead);
  const playbook = PLAYBOOKS[industry];
  const quality = checkMessage({
    kind,
    language,
    body: draft.body,
    companyName: lead.company || lead.name,
    verifiedFacts: facts.map((fact) => fact.fact),
  });
  const ready = isReady(quality);
  const saved = openDraftFor(lead.id, kind);
  const approved =
    saved?.status === "approved" &&
    saved.body.trim() === draft.body.trim() &&
    (saved.subject ?? "") === (draft.subject ?? "");
  const unsaved = !saved || saved.body.trim() !== draft.body.trim() || (saved.subject ?? "") !== (draft.subject ?? "");
  const overLimit = kind === "connection_note" && draft.body.length > CONNECTION_NOTE_MAX;
  const emailable = EMAILABLE_KINDS.includes(kind);
  const to = recipient.trim();
  const validRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
  const blocked = Boolean(lead.do_not_contact);
  const consentFirst = needsConsentFirst(lead);
  const canSendEmail =
    approved &&
    !blocked &&
    !consentFirst &&
    emailable &&
    validRecipient &&
    Boolean(draft.subject?.trim()) &&
    busy === null;
  const personalAddress = Boolean(
    validRecipient && lead.name !== lead.company && looksPersonal(to, lead.name, lead.company)
  );
  const input: DraftInput = { leadId: lead.id, kind, channel, language, subject: draft.subject, body: draft.body };

  async function run(action: "save" | "approve" | "generate", work: () => Promise<void>) {
    setBusy(action);
    setNotice(null);
    try {
      await work();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  const lookup = emailLookup?.leadId === lead.id ? emailLookup : null;

  async function findEmail() {
    const id = lead!.id;
    setEmailLookup({ leadId: id, busy: "find" });
    try {
      const result = await onFindEmail(id);
      if (result.saved) setRecipient(result.saved);
      setEmailLookup({
        leadId: id,
        busy: null,
        found: result.found,
        message: result.saved
          ? `Found and saved ${result.saved}.`
          : result.found.length === 0
            ? "No address found on their website. Check their contact page or use LinkedIn."
            : result.found.some((item) => item.generic)
              ? "Pick an address to use it."
              : "Only personal-looking addresses found — cold email needs a company address (post@, kontakt@). Use LinkedIn instead.",
      });
    } catch (error) {
      setEmailLookup({ leadId: id, busy: null, error: error instanceof Error ? error.message : "Search failed." });
    }
  }

  async function saveEmail(email: string) {
    const id = lead!.id;
    setEmailLookup((current) => ({ ...(current?.leadId === id ? current : {}), leadId: id, busy: "save" }));
    try {
      await onSaveEmail(id, email);
      setEmailLookup({ leadId: id, busy: null, message: `Saved ${email} on the lead.` });
    } catch (error) {
      setEmailLookup({ leadId: id, busy: null, error: error instanceof Error ? error.message : "Couldn't save." });
    }
  }

  async function copy() {
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
    setBusy("log");
    setNotice(null);
    try {
      const message = await onMarkSent(input);
      setLocalMessages((current) => [...current, message]);
      setNotice({ kind: "ok", text: "Logged as sent. The follow-up date is set." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Couldn't log the message." });
    } finally {
      setBusy(null);
    }
  }

  async function sendEmail() {
    setBusy("send");
    setNotice(null);
    try {
      const result = await onSendEmail({
        leadId: lead!.id,
        kind,
        language,
        to,
        subject: draft.subject ?? "",
        body: draft.body,
      });
      if (result.message) {
        const message = result.message;
        setLocalMessages((current) => [...current, message]);
      } else {
        setUnlogged({ ...input, channel: "email", recipient: result.to });
      }
      setNotice(
        result.logged
          ? { kind: "ok", text: `Sent to ${result.to} and logged. The follow-up date is set.` }
          : {
              kind: "error",
              text: `Sent to ${result.to}, but it couldn't be logged. Don't send it again — log it below.`,
            }
      );
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Not sent." });
    } finally {
      setBusy(null);
      setConfirmingSend(false);
    }
  }

  const due = followUpDate(lead);
  const stepState = (message: LeadMessage | undefined, dueDate: string | null) =>
    message
      ? `Sent ${formatDateTime(message.created_at)}`
      : sequence.stopped
        ? "Stopped"
        : dueDate
          ? `Due ${formatDay(dueDate)}`
          : "Not yet";

  return (
    <div ref={rootRef} className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_340px]">
      {/* Editor */}
      <div className="grid content-start gap-4">
        {blocked && (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
            {lead.company || lead.name} asked not to be contacted. Sending is turned off.
          </p>
        )}
        {consentFirst && !blocked && (
          <p className="rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm">
            <span className="font-semibold">Polish company — no cold email or sales call.</span> Polish law (Prawo
            komunikacji elektronicznej, art. 398) needs their consent first, B2B too. Start on LinkedIn with a question,
            not an offer. Email unlocks once you&apos;ve recorded that they replied.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">To</span>
            <select className={selectClass} value={leadId} onChange={(event) => select({ leadId: event.target.value })}>
              {sortedLeads.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.company ? `${candidate.company} — ${candidate.name}` : candidate.name}
                  {candidate.do_not_contact
                    ? " (do not contact)"
                    : candidate.responded
                      ? " (replied)"
                      : candidate.first_contacted_on
                        ? " (contacted)"
                        : ""}
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
                  onClick={() => select({ language: value, fresh: true })}
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
              {value === sequence.next && !sequence.stopped && <span className="ml-1 text-xs opacity-60">· next</span>}
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
          <span className="flex flex-wrap items-baseline justify-between gap-2 font-medium">
            <span>
              Message{" "}
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  approved ? "bg-[#E3F3E6] text-[#1B8A3A]" : "bg-black/5 text-ink-muted"
                )}
              >
                {approved ? "Approved" : unsaved ? (saved ? "Edited since saving" : "Not saved") : "Draft saved"}
              </span>
            </span>
            <span className={cn("text-xs font-normal", overLimit ? "font-semibold text-danger" : "text-ink-muted")}>
              {draft.body.length}
              {kind === "connection_note" && ` / ${CONNECTION_NOTE_MAX}`} characters
            </span>
          </span>
          <Textarea
            rows={kind === "first_message" || kind === "email" ? 13 : 7}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            className="leading-6"
          />
        </label>

        {(() => {
          const result = openers[lead.id];
          if (needsOpener && !result)
            return (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Writing the opening from the verified
                facts…
              </p>
            );
          if (result && !result.ok && needsOpener)
            return <p className="text-sm text-ink-muted">Opening not written automatically: {result.error}</p>;
          if (result?.ok && !needsOpener && draft.body.includes(language === "no" ? result.no : result.en))
            return (
              <p className="text-sm text-ink-muted">
                Opening written from: “{result.fact}”. Check it reads right before approving.
              </p>
            );
          return null;
        })()}

        {/* Quality check */}
        <div className="grid gap-2 rounded-xl border border-black/10 bg-background p-3 text-sm">
          <p className={cn("flex items-center gap-2 font-semibold", ready ? "text-[#1B8A3A]" : "text-danger")}>
            {ready ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {ready
              ? quality.length === 0
                ? "Quality check passed"
                : `Ready to approve · ${quality.length} note${quality.length === 1 ? "" : "s"}`
              : "Not ready to approve"}
          </p>
          {quality.length > 0 && (
            <ul className="grid gap-1.5">
              {quality.map((issue) => (
                <li key={issue.id} className="flex items-start gap-2">
                  {issue.level === "error" ? (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
                  ) : issue.level === "warning" ? (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6200]" aria-hidden="true" />
                  ) : (
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  )}
                  <span>
                    <span className="font-medium">{issue.title}.</span>{" "}
                    <span className="text-ink-muted">{issue.suggestion}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Draft actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void run("save", async () => {
                const message = await onSaveDraft(input);
                setLocalMessages((current) => [...current.filter((m) => m.id !== message.id), message]);
                setNotice({ kind: "ok", text: "Draft saved." });
              })
            }
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
          >
            {busy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save draft
          </button>
          <button
            type="button"
            disabled={busy !== null || !ready || approved || blocked}
            title={!ready ? "Fix the errors in the quality check first" : undefined}
            onClick={() =>
              void run("approve", async () => {
                const message = await onApprove(input);
                setLocalMessages((current) => [...current.filter((m) => m.id !== message.id), message]);
                setNotice({ kind: "ok", text: "Approved — you can now send it or log it as sent." });
              })
            }
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
          >
            {busy === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            {approved ? "Approved" : "Approve"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void run("generate", async () => {
                const result = await onGenerate({ leadId: lead.id, kind, language });
                if (!result.ok) throw new Error(result.error);
                setDraft({ subject: result.subject ?? draft.subject, body: result.body });
                setNotice({
                  kind: "ok",
                  text: `Draft written by Claude ($${result.costUsd.toFixed(3)}). Check every claim before approving.`,
                });
              })
            }
            className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-ink-muted hover:text-foreground"
          >
            {busy === "generate" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Generate with Claude
          </button>
          {lead.research?.message_no && language === "no" && (kind === "first_message" || kind === "email") && (
            <button
              type="button"
              onClick={() => setDraft({ ...draft, body: lead.research?.message_no ?? draft.body })}
              className="px-2 text-sm font-semibold text-ink-muted hover:text-foreground"
            >
              Use the researched draft
            </button>
          )}
          <button
            type="button"
            onClick={() => select({ fresh: true })}
            className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-ink-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Template
          </button>
        </div>

        {/* Send */}
        <div
          className={cn(
            "grid gap-3 rounded-xl border bg-background p-4",
            approved ? "border-foreground/30" : "border-black/10"
          )}
        >
          {!approved && <p className="text-sm text-ink-muted">Approve the message to send it or log it as sent.</p>}
          {emailable && (
            <div className="grid gap-1.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor="composer-to" className="font-medium">
                  To
                </label>
                <div className="flex flex-wrap gap-3">
                  {lead.email && to !== lead.email && (
                    <button
                      type="button"
                      onClick={() => setRecipient(lead.email ?? "")}
                      className="text-xs font-semibold text-ink-muted hover:text-foreground"
                    >
                      Use saved address ({lead.email})
                    </button>
                  )}
                  {validRecipient && to.toLowerCase() !== (lead.email ?? "").toLowerCase() && (
                    <button
                      type="button"
                      disabled={lookup?.busy != null}
                      onClick={() => void saveEmail(to)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-foreground"
                    >
                      {lookup?.busy === "save" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                      Save to lead
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={lookup?.busy != null}
                    onClick={() => void findEmail()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-foreground"
                  >
                    {lookup?.busy === "find" ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="h-3 w-3" aria-hidden="true" />
                    )}
                    {lookup?.busy === "find" ? "Searching website…" : "Find email"}
                  </button>
                </div>
              </div>
              <Input
                id="composer-to"
                type="email"
                value={recipient}
                placeholder="post@company.no"
                onChange={(event) => {
                  setRecipient(event.target.value);
                  setConfirmingSend(false);
                }}
              />
              {lookup?.message && <p className="text-xs text-ink-muted">{lookup.message}</p>}
              {lookup?.error && <p className="text-xs text-danger">{lookup.error}</p>}
              {lookup?.found && lookup.found.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lookup.found.map((item) => (
                    <button
                      key={item.email}
                      type="button"
                      title={`Found on ${item.source}`}
                      onClick={() => {
                        setRecipient(item.email);
                        setConfirmingSend(false);
                      }}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        item.generic ? "border-black/15 hover:border-black/40" : "border-danger/30 text-danger"
                      )}
                    >
                      {item.email}
                      {!item.generic && " · personal?"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {emailable && (
              <button
                type="button"
                onClick={() => setConfirmingSend(true)}
                disabled={!canSendEmail || confirmingSend}
                className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {validRecipient ? `Send email to ${to}` : "Send email"}
              </button>
            )}
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
                disabled={!approved || busy !== null}
                className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
              >
                {busy === "log" ? (
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
              Send this approved email to <span className="font-semibold">{to}</span> now? It goes out from{" "}
              <span className="font-semibold">{senderAddress ?? "the site's mail account"}</span>; replies go to
              info@enodre.com.
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
                disabled={busy !== null}
                className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
              >
                {busy === "send" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {busy === "send" ? "Sending..." : "Send now"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingSend(false)}
                disabled={busy !== null}
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
              disabled={busy !== null}
              onClick={async () => {
                setBusy("log");
                try {
                  const message = await onMarkSent(unlogged);
                  setLocalMessages((current) => [...current, message]);
                  setUnlogged(null);
                  setNotice({ kind: "ok", text: "Logged. The follow-up date is set." });
                } catch {
                  setNotice({
                    kind: "error",
                    text: "Still couldn't log it. Run the latest SQL files in Supabase, then try again.",
                  });
                } finally {
                  setBusy(null);
                }
              }}
              className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
            >
              Log the sent email
            </button>
          </div>
        )}
      </div>

      {/* Reference panel */}
      <aside className="grid content-start gap-5 rounded-xl border border-black/10 bg-background p-4 text-sm">
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
          <p className="mt-1 text-xs text-ink-muted">
            {playbook.label}
            {lead.segment && ` · ${segmentLabels[lead.segment]}`}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Verified facts</p>
          {facts.length === 0 ? (
            <p className="mt-1 text-ink-muted">
              None yet — research them, or add a fact with its source on the lead page. Until then, keep the opening
              plain.
            </p>
          ) : (
            <ul className="mt-1 grid gap-2">
              {facts.map((fact, index) => (
                <li key={index} className="leading-5">
                  {fact.fact}{" "}
                  <a
                    href={fact.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
                  >
                    source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Suggested angle (hypothesis)</p>
          <p className="mt-1 leading-5">{lead.research?.likely_pain || playbook.openingQuestions[0][language]}</p>
        </div>

        <div className="grid gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sequence</p>
          {[
            ["1. First message", stepState(sequence.first, null)],
            ["2. Follow-up", stepState(sequence.follow, sequence.first && !sequence.follow ? due : null)],
            ["3. Final follow-up", stepState(sequence.final, sequence.follow && !sequence.final ? due : null)],
          ].map(([label, state]) => (
            <div key={label} className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="text-xs text-ink-muted">{state}</span>
            </div>
          ))}
          {!sequence.stopped && sequence.first && !sequence.done && (
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => void onStopSequence(lead.id, "paused")}
                className="font-semibold text-ink-muted hover:text-foreground"
              >
                Pause follow-ups
              </button>
              <button
                type="button"
                onClick={() => void onStopSequence(lead.id, "declined")}
                className="font-semibold text-ink-muted hover:text-foreground"
              >
                They declined
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Mark as do not contact? This stops follow-ups and blocks sending."))
                    void onStopSequence(lead.id, "do_not_contact");
                }}
                className="font-semibold text-danger"
              >
                Do not contact
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">They replied?</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(RESPONSE_LABELS) as ResponseType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={async () => {
                  setReplyType(type);
                  await onRecordResponse(lead.id, type);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  replyType === type
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/10 hover:border-black/30"
                )}
              >
                {responseLabel(industry, type)}
              </button>
            ))}
          </div>
          {replyType && (
            <div className="mt-1 grid gap-1.5 rounded-lg bg-black/[0.03] p-2">
              <p className="text-xs text-ink-muted">Recorded, follow-ups stopped. Suggested reply:</p>
              <p className="text-xs leading-5">{responseReply(industry, replyType, language)}</p>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(responseReply(industry, replyType, language))
                    .catch(() => undefined)
                }
                className="justify-self-start text-xs font-semibold hover:underline"
              >
                Copy reply
              </button>
            </div>
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
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 font-semibold hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call {lead.phone}
            </a>
          )}
          {!lead.phone && !lead.email && (
            <p className="text-xs text-ink-muted">No email or phone yet — add them in Details.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sent so far</p>
          {sent.length === 0 ? (
            <p className="mt-1 text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="mt-1 grid gap-1.5">
              {[...sent].reverse().map((message) => (
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
    </div>
  );
}
