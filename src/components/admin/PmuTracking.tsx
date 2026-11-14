"use client";

import { useState } from "react";
import { CalendarClock, Check, Mail, MessageCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mailtoLink, whatsappLink, type PmuOffer, type PmuProfile, type PmuTarget } from "@/lib/pmu-agent";
import {
  ACTIVITY_KINDS,
  OUTREACH,
  STAGES,
  activityLabels,
  followUpMessage,
  nextStep,
  overview,
  stageIndex,
  type ActivityKind,
  type PmuActivity,
} from "@/lib/pmu-tracking";

type Result = { ok: true } | { ok: false; error: string };
export type LogActivity = (id: string, input: { kind: ActivityKind; note?: string; on?: string }) => Promise<Result>;

export const osloToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });

const shortDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function dueLabel(due: string, today: string) {
  if (due === today) return "today";
  const days = Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 1) return "tomorrow";
  return shortDay(due);
}

const firstSentOf = (target: PmuTarget, activities: PmuActivity[]) =>
  activities
    .filter((activity) => activity.target_id === target.id && OUTREACH.includes(activity.kind))
    .sort((a, b) => a.at.localeCompare(b.at))[0]?.at ?? target.last_contacted_on;

/** The stage bar: where a place is on the way from first message to offer. */
export function StageBar({ status }: { status: PmuTarget["status"] }) {
  const reached = stageIndex(status);
  const parked = status === "not_now" || status === "declined" || status === "not_relevant";
  return (
    <div className="mt-2 flex items-center gap-1" aria-label={`Stage: ${status.replace("_", " ")}`}>
      {STAGES.slice(1).map((stage, index) => {
        const done = reached !== null && index + 1 <= reached;
        return (
          <span
            key={stage.status}
            title={stage.label}
            className={cn("h-1.5 flex-1 rounded-full", parked ? "bg-black/10" : done ? "bg-accent" : "bg-accent/15")}
          />
        );
      })}
    </div>
  );
}

/** One line under a card: what's next and when. */
export function NextStepLine({
  target,
  activities,
  today,
}: {
  target: PmuTarget;
  activities: PmuActivity[];
  today: string;
}) {
  const step = nextStep(target, activities, today);
  if (!step || target.status === "to_contact") return null;
  const late = step.due < today;
  return (
    <p className={cn("mt-1 flex items-center gap-1.5 text-xs", late ? "font-semibold text-danger" : "text-ink-muted")}>
      <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {step.action} · {dueLabel(step.due, today)}
    </p>
  );
}

function FollowUpButtons({
  target,
  activities,
  profile,
  step,
  onLog,
  busy,
}: {
  target: PmuTarget;
  activities: PmuActivity[];
  profile: PmuProfile;
  step: "follow_up_1" | "follow_up_2" | "last";
  onLog: (kind: ActivityKind) => void;
  busy: boolean;
}) {
  const text = followUpMessage(target, step, firstSentOf(target, activities), profile.portfolio_instagram || undefined);
  const whatsapp = whatsappLink(target.whatsapp, text);
  const mailto = mailtoLink(target.email, `Following up – Olga Goryszewska, senior PMU artist`, text);
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <pre className="whitespace-pre-wrap rounded-xl bg-background p-3 font-sans text-sm leading-6">{text}</pre>
      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => !busy && onLog("whatsapp_sent")}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#1B8A3A] px-4 text-sm font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp it
          </a>
        )}
        {mailto && (
          <a
            href={mailto}
            onClick={() => !busy && onLog("email_sent")}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent"
          >
            <Mail className="h-4 w-4" aria-hidden="true" /> Email it
          </a>
        )}
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard
              .writeText(text)
              .then(() => setCopied(true))
              .catch(() => undefined)
          }
          className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-accent"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** The top of the page: follow-ups, calls and answers due today or late, oldest first. */
export function TodayList({
  targets,
  activities,
  profile,
  onLog,
  onOpen,
}: {
  targets: PmuTarget[];
  activities: PmuActivity[];
  profile: PmuProfile;
  onLog: LogActivity;
  onOpen: (id: string) => void;
}) {
  const today = osloToday();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const due = targets
    .filter((target) => target.status !== "to_contact")
    .map((target) => ({ target, step: nextStep(target, activities, today) }))
    .filter((item): item is { target: PmuTarget; step: NonNullable<typeof item.step> } =>
      Boolean(item.step && item.step.due <= today)
    )
    .sort((a, b) => a.step.due.localeCompare(b.step.due));

  async function log(id: string, kind: ActivityKind) {
    setBusy(id);
    await onLog(id, { kind }).catch(() => undefined);
    setBusy(null);
  }

  return (
    <section className="rounded-3xl border border-accent/20 bg-card p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <CalendarClock className="h-5 w-5 text-accent" aria-hidden="true" /> Today ({due.length})
      </h2>
      {due.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nothing due. Follow-ups appear here on the day they&apos;re due.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {due.map(({ target, step }) => {
            const open = openId === target.id;
            const late = step.due < today;
            return (
              <li key={target.id} className="rounded-2xl border border-black/10 bg-background p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : target.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={open}
                  >
                    <p className="font-semibold leading-snug">
                      {target.name} <span className="text-xs font-normal text-ink-muted">· {target.city}</span>
                    </p>
                    <p className={cn("text-sm", late ? "font-semibold text-danger" : "text-accent")}>
                      {step.action} · {dueLabel(step.due, today)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpen(target.id)}
                    className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted hover:text-foreground"
                  >
                    Card
                  </button>
                </div>
                {open && (
                  <div className="mt-3 grid gap-3 border-t border-black/10 pt-3">
                    {step.message && step.message !== "first" ? (
                      <FollowUpButtons
                        target={target}
                        activities={activities}
                        profile={profile}
                        step={step.message}
                        onLog={(kind) => void log(target.id, kind)}
                        busy={busy === target.id}
                      />
                    ) : null}
                    <QuickLog targetId={target.id} onLog={onLog} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const QUICK: ActivityKind[] = [
  "whatsapp_sent",
  "email_sent",
  "form_sent",
  "called",
  "replied",
  "call_booked",
  "visit",
  "offer",
  "not_now",
  "declined",
];

/** One tap per step you took by hand: a WhatsApp, a call, their reply … */
export function QuickLog({ targetId, onLog }: { targetId: string; onLog: LogActivity }) {
  const [note, setNote] = useState("");
  const [on, setOn] = useState("");
  const [saving, setSaving] = useState<ActivityKind | null>(null);
  const [done, setDone] = useState<ActivityKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function log(kind: ActivityKind) {
    setSaving(kind);
    setError(null);
    const result = await onLog(targetId, { kind, note: note || undefined, on: on || undefined }).catch(() => ({
      ok: false as const,
      error: "Couldn't save.",
    }));
    setSaving(null);
    if (result.ok) {
      setDone(kind);
      setNote("");
      setOn("");
    } else setError(result.error);
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Log a step</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={saving !== null}
            onClick={() => void log(kind)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-xs font-semibold",
              kind === "declined"
                ? "border-danger/30 text-danger"
                : kind === "replied" || kind === "offer"
                  ? "border-[#1B8A3A]/30 text-[#1B8A3A]"
                  : "border-accent/25 text-accent",
              done === kind && "bg-accent text-white"
            )}
          >
            {done === kind ? <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> : null}
            {activityLabels[kind]}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Note (optional): who you spoke to, what they said"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="py-2"
        />
        <input
          type="date"
          aria-label="When (leave empty for today)"
          value={on}
          onChange={(event) => setOn(event.target.value)}
          className="min-h-10 rounded-xl border border-black/10 bg-card px-3 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={saving !== null || !note.trim()}
        onClick={() => void log("note")}
        className="w-fit text-xs font-semibold text-ink-muted hover:text-foreground disabled:opacity-40"
      >
        Save as a note only
      </button>
      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

/** Inside an open card: next step (yours or suggested), history, and the offer. */
export function TargetTrack({
  target,
  activities,
  profile,
  onLog,
  onDeleteActivity,
  onSetNextStep,
  onSaveOffer,
}: {
  target: PmuTarget;
  activities: PmuActivity[];
  profile: PmuProfile;
  onLog: LogActivity;
  onDeleteActivity: (id: string) => Promise<Result>;
  onSetNextStep: (id: string, input: { action?: string; on: string | null }) => Promise<Result>;
  onSaveOffer: (id: string, offer: PmuOffer) => Promise<Result>;
}) {
  const today = osloToday();
  const step = nextStep(target, activities, today);
  const history = activities
    .filter((activity) => activity.target_id === target.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const [custom, setCustom] = useState({ action: target.next_action ?? "", on: target.next_action_on ?? "" });
  const [offer, setOffer] = useState<PmuOffer>(target.offer ?? {});
  const [message, setMessage] = useState<string | null>(null);

  async function save(work: () => Promise<Result>, done: string) {
    setMessage(null);
    const result = await work().catch(() => ({ ok: false as const, error: "Couldn't save." }));
    setMessage(result.ok ? done : result.error);
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-accent/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Next step</p>
        {step ? (
          <p className={cn("mt-1 text-sm font-semibold", step.due < today ? "text-danger" : "text-accent")}>
            {step.action} · {dueLabel(step.due, today)}
            {step.custom ? " (yours)" : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">None: this one is closed.</p>
        )}
        {step?.message && step.message !== "first" && (
          <div className="mt-2">
            <FollowUpButtons
              target={target}
              activities={activities}
              profile={profile}
              step={step.message}
              onLog={(kind) => void onLog(target.id, { kind })}
              busy={false}
            />
          </div>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            placeholder="Your own next step, e.g. Send prices"
            value={custom.action}
            onChange={(event) => setCustom({ ...custom, action: event.target.value })}
            className="py-2"
          />
          <input
            type="date"
            aria-label="By when"
            value={custom.on}
            onChange={(event) => setCustom({ ...custom, on: event.target.value })}
            className="min-h-10 rounded-xl border border-black/10 bg-card px-3 text-sm"
          />
          <button
            type="button"
            onClick={() =>
              void save(
                () => onSetNextStep(target.id, { action: custom.action, on: custom.on || null }),
                custom.action && custom.on ? "Next step saved." : "Back to the suggested next step."
              )
            }
            className="min-h-10 rounded-full bg-accent px-4 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      </div>

      <QuickLog targetId={target.id} onLog={onLog} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">History ({history.length})</p>
        {history.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">Nothing logged yet.</p>
        ) : (
          <ol className="mt-2 grid gap-1.5 border-l-2 border-accent/20 pl-3">
            {history.map((activity) => (
              <li key={activity.id} className="flex items-start gap-2 text-sm">
                <span className="w-16 shrink-0 text-xs text-ink-muted">{shortDay(activity.at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{activityLabels[activity.kind]}</span>
                  {activity.note ? <span className="text-ink-muted"> · {activity.note}</span> : null}
                </span>
                <button
                  type="button"
                  aria-label="Delete this step"
                  onClick={() => {
                    if (window.confirm("Delete this step from the history?")) void onDeleteActivity(activity.id);
                  }}
                  className="text-ink-muted hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {(target.status === "offer" || target.status === "accepted" || target.offer) && (
        <div className="rounded-xl border border-[#1B8A3A]/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1B8A3A]">The offer</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["salary", "Basic salary"],
                ["commission", "Commission %"],
                ["housing", "Housing"],
                ["visa", "Visa and licence costs"],
                ["flights", "Flights"],
                ["insurance", "Health insurance"],
                ["start", "Start date"],
                ["notes", "Other"],
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                placeholder={label}
                aria-label={label}
                value={offer[key] ?? ""}
                onChange={(event) => setOffer({ ...offer, [key]: event.target.value })}
                className="py-2"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => void save(() => onSaveOffer(target.id, offer), "Offer saved.")}
            className="mt-2 min-h-10 rounded-full bg-[#1B8A3A] px-4 text-sm font-semibold text-white"
          >
            Save offer
          </button>
        </div>
      )}
      {message && <p className="text-xs font-semibold text-ink-muted">{message}</p>}
    </div>
  );
}

/** Stages at a glance, which channel gets answers, and where. */
export function OverviewPanel({ targets, activities }: { targets: PmuTarget[]; activities: PmuActivity[] }) {
  const data = overview(targets, activities, osloToday());
  const rate = (row: { contacted: number; replied: number }) =>
    row.contacted ? `${Math.round((row.replied / row.contacted) * 100)}%` : "–";
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {data.byStage
          .filter((stage) => stage.count > 0 || ["Contacted", "Replied", "Call", "Offer"].includes(stage.label))
          .map((stage) => (
            <div key={stage.label} className="rounded-2xl border border-black/10 bg-background p-3">
              <p className="text-xs text-ink-muted">{stage.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{stage.count}</p>
            </div>
          ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Answers by first channel", rows: data.byChannel.map((row) => ({ name: row.channel, ...row })) },
          { title: "Answers by country", rows: data.byCountry.map((row) => ({ name: row.country, ...row })) },
        ].map((table) => (
          <div key={table.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{table.title}</p>
            {table.rows.length === 0 ? (
              <p className="mt-1 text-xs text-ink-muted">Nothing sent yet.</p>
            ) : (
              <ul className="mt-2 grid gap-1.5">
                {table.rows.map((row) => (
                  <li key={row.name} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate">{row.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-accent/10">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: row.contacted ? `${(row.replied / row.contacted) * 100}%` : "0%" }}
                      />
                    </span>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-muted">
                      {row.replied}/{row.contacted} · {rate(row)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {data.overdue > 0 ? `${data.overdue} follow-up${data.overdue === 1 ? " is" : "s are"} late. ` : ""}
        {data.dueToday > 0 ? `${data.dueToday} due today.` : ""}
      </p>
    </div>
  );
}

/** Offers side by side, against the questions to ask every employer. */
export function OfferComparison({ targets }: { targets: PmuTarget[] }) {
  const withOffers = targets.filter((target) => target.offer && Object.values(target.offer).some(Boolean));
  if (withOffers.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No offers yet. When one arrives, log “Offer received” and fill it in.</p>
    );
  }
  const rows: [keyof PmuOffer, string][] = [
    ["salary", "Basic salary"],
    ["commission", "Commission"],
    ["housing", "Housing"],
    ["visa", "Visa and licence"],
    ["flights", "Flights"],
    ["insurance", "Health insurance"],
    ["start", "Start"],
    ["notes", "Other"],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-accent/5 text-xs text-ink-muted">
          <tr>
            <th className="p-2 font-semibold"> </th>
            {withOffers.map((target) => (
              <th key={target.id} className="p-2 font-semibold text-foreground">
                {target.name}
                <span className="block font-normal text-ink-muted">{target.city}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label]) => (
            <tr key={key} className="border-t border-black/5">
              <td className="p-2 text-xs font-semibold text-ink-muted">{label}</td>
              {withOffers.map((target) => (
                <td key={target.id} className={cn("p-2", !target.offer?.[key] && "text-danger")}>
                  {target.offer?.[key] || "Ask"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { ACTIVITY_KINDS };
