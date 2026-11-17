"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Banknote,
  Check,
  BarChart3,
  ClipboardList,
  Scale,
  Copy,
  ExternalLink,
  RotateCcw,
  Star,
  Trash2,
  X,
  Eye,
  Loader2,
  Search,
  Camera,
  Mail,
  MessageCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Store,
} from "lucide-react";
import { Accordion } from "@/components/admin/Accordion";
import {
  NextStepLine,
  OfferComparison,
  OverviewPanel,
  StageBar,
  TargetTrack,
  TodayList,
  osloToday,
  type LogActivity,
} from "@/components/admin/PmuTracking";
import type { ActivityKind, PmuActivity } from "@/lib/pmu-tracking";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  NEGOTIATION_CHECKLIST,
  PAY_GUIDE,
  PMU_KIND_VALUES,
  PMU_STATUS_VALUES,
  RED_FLAGS,
  byPay,
  instagramLink,
  mailtoLink,
  pmuEmail,
  pmuKindLabels,
  pmuShortMessage,
  pmuStatusLabels,
  whatsappLink,
  type PmuKind,
  type PmuOffer,
  type PmuProfile,
  type PmuStatus,
  type PmuTarget,
} from "@/lib/pmu-agent";

type Result = { ok: true } | { ok: false; error: string };

export type PmuPosting = {
  id: string;
  created_at: string;
  source: "nav" | "alert" | "careers";
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  snippet: string | null;
  score: number;
  matched: string[];
  status: "new" | "applied" | "dismissed";
};

export type PmuRun = { id: string; created_at: string; trigger: string; report: string | null };

const SOURCE_LABELS: Record<PmuPosting["source"], string> = {
  nav: "NAV",
  alert: "Job alert",
  careers: "Careers page",
};

const WEEK_MS = 7 * 86_400_000;
const isNew = (target: PmuTarget) =>
  Boolean(target.discovered_at && Date.now() - new Date(target.discovered_at).getTime() < WEEK_MS);

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  });

const STATUS_STYLES: Record<PmuStatus, string> = {
  to_contact: "bg-accent/10 text-accent",
  contacted: "bg-black/5 text-ink-muted",
  followed_up: "bg-black/5 text-ink-muted",
  replied: "bg-[#E3F3E6] text-[#1B8A3A]",
  interview: "bg-[#E3F3E6] text-[#1B8A3A]",
  trial: "bg-[#E3F3E6] text-[#1B8A3A]",
  offer: "bg-[#1B8A3A] text-white",
  accepted: "bg-[#1B8A3A] text-white",
  not_now: "bg-black/5 text-ink-muted",
  declined: "bg-danger/10 text-danger",
  not_relevant: "bg-black/5 text-ink-muted",
};

// The status filter: groups of stages, in the order a conversation goes.
const STATUS_FILTERS: { key: string; label: string; statuses: PmuStatus[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "to_contact", label: "Not contacted", statuses: ["to_contact"] },
  { key: "waiting", label: "Waiting for reply", statuses: ["contacted", "followed_up"] },
  { key: "talking", label: "Replied / in talks", statuses: ["replied", "interview", "trial"] },
  { key: "offers", label: "Offers", statuses: ["offer", "accepted"] },
  { key: "closed", label: "Declined / not now", statuses: ["not_now", "declined", "not_relevant"] },
];

/**
 * The search box: every word must appear somewhere in the place's name, town,
 * country, services, contacts or notes. Accents don't matter ("javea" finds Jávea).
 */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function matchesQuery(target: PmuTarget, query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(
    [
      target.name,
      target.city,
      target.country,
      target.services,
      target.pay_note,
      target.notes,
      target.email,
      target.whatsapp,
      target.instagram,
      target.website,
      pmuKindLabels[target.kind],
      pmuStatusLabels[target.status],
    ]
      .filter(Boolean)
      .join(" ")
  );
  return words.every((word) => haystack.includes(word));
}

const payDots = (score: number) => "●".repeat(score) + "○".repeat(5 - score);

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined)
      }
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent/30 px-3 text-xs font-semibold text-accent hover:bg-accent/5"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** The PMU job agent: licence progress, who to contact and how, pay and red flags. */
export function PmuAgent({
  targets: allTargets,
  profile: savedProfile,
  setupMissing,
  postings,
  runs,
  onRun,
  onSetPostingStatus,
  onUpdate,
  activities,
  onLog,
  onDeleteActivity,
  onSetNextStep,
  onSaveOffer,
  onSetHidden,
  onSetFavourite,
  onAdd,
  onSaveProfile,
}: {
  targets: PmuTarget[];
  profile: PmuProfile;
  setupMissing: boolean;
  postings: PmuPosting[];
  runs: PmuRun[];
  onRun: (
    preview: boolean
  ) => Promise<{ ok: true; places: number; ads: number; report: string } | { ok: false; error: string }>;
  onSetPostingStatus: (id: string, status: PmuPosting["status"]) => Promise<Result>;
  onUpdate: (
    id: string,
    input: { status?: PmuStatus; notes?: string; whatsapp?: string; instagram?: string; email?: string }
  ) => Promise<Result>;
  activities: PmuActivity[];
  onLog: LogActivity;
  onDeleteActivity: (id: string) => Promise<Result>;
  onSetNextStep: (id: string, input: { action?: string; on: string | null }) => Promise<Result>;
  onSaveOffer: (id: string, offer: PmuOffer) => Promise<Result>;
  onSetHidden: (id: string, hidden: boolean) => Promise<Result>;
  onSetFavourite: (id: string, favourite: boolean) => Promise<Result>;
  onAdd: (input: {
    kind: PmuKind;
    name: string;
    city: string;
    country: string;
    website?: string;
    instagram?: string;
    whatsapp?: string;
    email?: string;
    pay_score: number;
    notes?: string;
  }) => Promise<Result>;
  onSaveProfile: (key: string, value: string) => Promise<Result>;
}) {
  // Removed places leave every list, count and reminder; "Show removed" brings them back into view.
  const [showRemoved, setShowRemoved] = useState(false);
  const [removedNow, setRemovedNow] = useState<Record<string, boolean>>({});
  const [favouriteNow, setFavouriteNow] = useState<Record<string, boolean>>({});
  const isHidden = (target: PmuTarget) => removedNow[target.id] ?? Boolean(target.hidden);
  const targets = allTargets.filter((target) => !isHidden(target));
  const removedCount = allTargets.length - targets.length;
  const [profile, setProfile] = useState<PmuProfile>(savedProfile);
  const [country, setCountry] = useState("All");
  const [kind, setKind] = useState<PmuKind | "all">("all");
  const [hideClosed, setHideClosed] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    kind: "clinic" as PmuKind,
    name: "",
    city: "",
    country: "",
    website: "",
    instagram: "",
    whatsapp: "",
    email: "",
    pay_score: 3,
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState<"run" | "preview" | null>(null);
  const [searchResult, setSearchResult] = useState<{ preview: boolean; report: string } | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const statusGroup = STATUS_FILTERS.find((item) => item.key === statusFilter)?.statuses ?? null;

  async function search(preview: boolean) {
    setSearching(preview ? "preview" : "run");
    setError(null);
    try {
      const result = await onRun(preview);
      if (!result.ok) setError(result.error);
      else setSearchResult({ preview, report: result.report });
    } catch {
      setError("The search failed. Try again.");
    } finally {
      setSearching(null);
    }
  }

  const countries = useMemo(() => ["All", ...new Set(targets.map((item) => item.country))], [targets]);
  const shown = useMemo(
    () =>
      byPay(
        (showRemoved ? allTargets : targets).filter(
          (item) =>
            (country === "All" || item.country === country) &&
            (kind === "all" || item.kind === kind) &&
            (statusGroup
              ? statusGroup.includes(item.status)
              : !hideClosed || (item.status !== "declined" && item.status !== "not_relevant")) &&
            (!onlyNew || isNew(item)) &&
            matchesQuery(item, query)
        )
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targets is derived from allTargets and removedNow
    [allTargets, removedNow, showRemoved, country, kind, hideClosed, onlyNew, query, statusGroup]
  );
  const newCount = targets.filter(isNew).length;
  // The daily search's finds this week, best fit first.
  const found = byPay(targets.filter(isNew));
  const isFavourite = (target: PmuTarget) => favouriteNow[target.id] ?? Boolean(target.favourite);
  const favourites = shown.filter(isFavourite);
  const others = shown.filter((target) => !isFavourite(target));
  const freshAds = postings.filter((posting) => posting.status === "new");
  const count = (status: PmuStatus) => targets.filter((item) => item.status === status).length;
  const today = osloToday();

  function run(work: () => Promise<Result>) {
    setError(null);
    startTransition(async () => {
      const result = await work().catch(() => ({ ok: false as const, error: "Couldn't save." }));
      if (!result.ok) setError(result.error);
    });
  }

  function saveField(key: string, value: string) {
    if ((savedProfile[key] ?? "") === value) return;
    run(() => onSaveProfile(key, value));
  }

  // One place's card; favourites use the same card inside the green section.
  const renderCard = (target: PmuTarget) => {
    const short = pmuShortMessage(target, profile);
    const email = pmuEmail(target, profile);
    const whatsapp = whatsappLink(target.whatsapp, short);
    const instagram = instagramLink(target.instagram);
    const mailto = mailtoLink(target.email, email.subject, email.body);
    const open = openId === target.id;
    // Opening WhatsApp, Instagram or email logs the message in the history.
    const sent = (kind: ActivityKind) => run(() => onLog(target.id, { kind }));
    return (
      <li
        key={target.id}
        id={`pmu-${target.id}`}
        className={cn(
          "scroll-mt-24 rounded-2xl border bg-card p-4 shadow-sm",
          isFavourite(target) ? "border-[#1B8A3A]/40" : "border-black/10"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setOpenId(open ? null : target.id)}
            aria-expanded={open}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-base font-semibold leading-snug">
              {target.name}
              {isNew(target) && (
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-[11px] font-semibold text-white">
                  New
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {pmuKindLabels[target.kind]} · {target.city}, {target.country}
            </p>
            <p className="mt-1 text-xs">
              <span className="tracking-widest text-accent" title="Pay potential, 1–5">
                {payDots(target.pay_score)}
              </span>{" "}
              <span className="text-ink-muted">{target.pay_note}</span>
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !isFavourite(target);
              setFavouriteNow((current) => ({ ...current, [target.id]: next }));
              run(async () => {
                const result = await onSetFavourite(target.id, next);
                if (!result.ok) setFavouriteNow((current) => ({ ...current, [target.id]: !next }));
                return result;
              });
            }}
            aria-label={
              isFavourite(target) ? `Remove ${target.name} from favourites` : `Add ${target.name} to favourites`
            }
            aria-pressed={isFavourite(target)}
            title={isFavourite(target) ? "Favourite: tap to remove" : "Mark as favourite"}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              isFavourite(target) ? "bg-[#1B8A3A] text-white" : "text-ink-muted hover:bg-[#E3F3E6] hover:text-[#1B8A3A]"
            )}
          >
            <Star className={cn("h-4 w-4", isFavourite(target) && "fill-current")} aria-hidden="true" />
          </button>
          <select
            aria-label={`Status of ${target.name}`}
            value={target.status}
            disabled={pending}
            onChange={(event) => run(() => onUpdate(target.id, { status: event.target.value as PmuStatus }))}
            className={cn(
              "min-h-9 shrink-0 rounded-full border-0 px-3 text-xs font-semibold",
              STATUS_STYLES[target.status]
            )}
          >
            {PMU_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {pmuStatusLabels[value]}
              </option>
            ))}
          </select>
        </div>
        {isHidden(target) && (
          <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs text-ink-muted">
            Removed from your list.
            <button
              type="button"
              onClick={() => {
                setRemovedNow((current) => ({ ...current, [target.id]: false }));
                run(() => onSetHidden(target.id, false));
              }}
              className="inline-flex items-center gap-1 font-semibold text-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore
            </button>
          </p>
        )}
        <StageBar status={target.status} />
        <NextStepLine target={target} activities={activities} today={today} />
        {target.services && <p className="mt-2 text-sm">{target.services}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sent("whatsapp_sent")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#1B8A3A] px-4 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
          ) : (
            // No number yet: search for it, with the message copied, and open the card to save it.
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`"${target.name}" ${target.city} WhatsApp`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void navigator.clipboard.writeText(short).catch(() => undefined);
                setOpenId(target.id);
              }}
              title="No number saved yet: searches for it and copies the message. Paste the number in the card to get the WhatsApp link."
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#1B8A3A]/40 px-4 text-sm font-semibold text-[#1B8A3A]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Find WhatsApp
            </a>
          )}
          {instagram && (
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void navigator.clipboard.writeText(short).catch(() => undefined);
                sent("instagram_sent");
              }}
              title="Opens their profile; the message is copied for you to paste"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white"
            >
              <Camera className="h-4 w-4" aria-hidden="true" /> Instagram
            </a>
          )}
          {mailto && (
            <a
              href={mailto}
              onClick={() => sent("email_sent")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
          )}
          {(target.website || target.source_url) && (
            <a
              href={target.website ?? target.source_url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink-muted"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> {target.website ? "Website" : "Source"}
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpenId(open ? null : target.id)}
            className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-accent"
          >
            {open ? "Hide message" : "Message"}
          </button>
          {!isHidden(target) && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Remove ${target.name} from your list? You can bring it back with "Show removed".`))
                  return;
                setRemovedNow((current) => ({ ...current, [target.id]: true }));
                run(() => onSetHidden(target.id, true));
              }}
              aria-label={`Remove ${target.name}`}
              title="Remove from your list"
              className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </button>
          )}
        </div>

        {open && (
          <div className="mt-3 grid gap-3 border-t border-black/10 pt-3">
            <TargetTrack
              target={target}
              activities={activities}
              profile={profile}
              onLog={onLog}
              onDeleteActivity={onDeleteActivity}
              onSetNextStep={onSetNextStep}
              onSaveOffer={onSaveOffer}
            />
            {!whatsapp && !instagram && !mailto && (
              <p className="rounded-xl bg-accent/5 p-3 text-xs">
                No WhatsApp, Instagram or email saved yet. Find one on their website or Google listing and add it below,
                or copy the message.
              </p>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">WhatsApp / Instagram</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-background p-3 font-sans text-sm leading-6">
                {short}
              </pre>
              <div className="mt-2">
                <CopyButton text={short} label="Copy message" />
              </div>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-accent">
                Email version (attach your PMU CV)
              </summary>
              <p className="mt-2 text-xs text-ink-muted">Subject: {email.subject}</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-background p-3 font-sans text-sm leading-6">
                {email.body}
              </pre>
              <div className="mt-2">
                <CopyButton text={`${email.subject}\n\n${email.body}`} label="Copy email" />
              </div>
            </details>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["whatsapp", "WhatsApp number"],
                  ["instagram", "Instagram handle"],
                  ["email", "Email"],
                ] as const
              ).map(([key, label]) => (
                <Input
                  key={key}
                  aria-label={`${label} for ${target.name}`}
                  placeholder={label}
                  defaultValue={target[key] ?? ""}
                  onBlur={(event) => {
                    if (event.target.value !== (target[key] ?? "")) {
                      run(() => onUpdate(target.id, { [key]: event.target.value }));
                    }
                  }}
                  className="py-2"
                />
              ))}
            </div>
            <textarea
              aria-label={`Notes on ${target.name}`}
              rows={2}
              placeholder="Notes: who you spoke to, what they offered"
              defaultValue={target.notes ?? ""}
              onBlur={(event) => {
                if (event.target.value !== (target.notes ?? "")) {
                  run(() => onUpdate(target.id, { notes: event.target.value }));
                }
              }}
              className="rounded-xl border border-black/10 bg-background p-3 text-sm"
            />
            {target.last_contacted_on && (
              <p className="text-xs text-ink-muted">Last contacted {target.last_contacted_on}</p>
            )}
          </div>
        )}
      </li>
    );
  };

  if (setupMissing) {
    return (
      <div className="rounded-3xl border border-accent/20 bg-card p-6">
        <h1 className="page-title text-2xl">PMU jobs</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Run supabase/pmu_agent.sql in the Supabase SQL Editor to switch it on.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:gap-8">
      <header className="rounded-3xl bg-gradient-to-br from-[#b0125b] to-[#e4569a] p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Semi-permanent makeup</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">PMU jobs</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          Clinics, studios and recruiters ranked by pay, with your message ready for WhatsApp, Instagram or email. You
          always press send yourself.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "To contact", value: count("to_contact") },
            { label: "Contacted", value: count("contacted") },
            { label: "Replied or interview", value: count("replied") + count("interview") },
            { label: "Offers", value: count("offer") + count("accepted") },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <dt className="text-xs text-white/80">{item.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <TodayList
        targets={targets}
        activities={activities}
        profile={profile}
        onLog={onLog}
        onOpen={(id) => {
          setCountry("All");
          setKind("all");
          setHideClosed(false);
          setOnlyNew(false);
          setOpenId(id);
          setTimeout(
            () => document.getElementById(`pmu-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
            50
          );
        }}
      />

      <Accordion
        icon={<Search className="h-4 w-4" aria-hidden="true" />}
        title="Daily search"
        subtitle={
          runs[0]
            ? `Last search ${dateTime(runs[0].created_at)} · ${newCount} new places this week · ${freshAds.length} job ads`
            : "Every morning: medical aesthetic clinics without PMU yet, and PMU job ads"
        }
        defaultOpen
        keepMounted
      >
        <p className="text-sm text-ink-muted">
          Every morning the agent looks for <strong>medical aesthetic clinics that don&apos;t offer PMU yet</strong> in
          Marbella, Málaga, Palma de Mallorca, Madrid, Barcelona, Valencia, Alicante, Lisbon, Porto and the Algarve,
          plus Moraira, Jávea, Altea, Albir, Calpe, Dénia, Estepona, Puerto Banús, Cascais, Vilamoura and Quinta do
          Lago. It searches Fresha and Google Maps for clinics doing injectables (which need a doctor), keeps premium
          ones (on Google, 4.5★ or more from at least 40 reviews), reads each website to check PMU isn&apos;t offered
          yet, and adds the 12 best fits. Salons, nail and hair places, PMU studios and clinics that already have PMU
          are skipped. It also collects <strong>PMU job ads</strong> from NAV, SHA Wellness Clinic&apos;s careers page,
          and the job alert emails in your Gmail.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void search(true)}
            disabled={searching !== null}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-4 text-sm")}
          >
            {searching === "preview" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {searching === "preview" ? "Looking, about a minute…" : "Preview (saves nothing)"}
          </button>
          <button
            type="button"
            onClick={() => void search(false)}
            disabled={searching !== null}
            className={cn(buttonVariants({ variant: "primary" }), "min-h-11 bg-accent px-4 text-sm text-white")}
          >
            {searching === "run" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            {searching === "run" ? "Searching, about a minute…" : "Search now"}
          </button>
        </div>
        {searchResult && (
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-background p-4 font-sans text-xs leading-5">
            {searchResult.report}
          </pre>
        )}

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Found this week ({found.length})
          </p>
          {found.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              Nothing new yet. New clinics appear here and in the list below, marked New.
            </p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {found.map((target) => (
                <li key={target.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(target.id);
                      document.getElementById(`pmu-${target.id}`)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full rounded-xl border border-black/10 bg-card px-3 py-2 text-left hover:border-accent/40"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold">{target.name}</span>
                      <span className="text-xs text-ink-muted">
                        {target.city} · {target.source === "google" ? "Google Maps" : "Fresha"}
                      </span>
                      <span className="ml-auto text-xs tracking-widest text-accent" title="Fit, 1–5">
                        {payDots(target.pay_score)}
                      </span>
                    </span>
                    {target.pay_note && <span className="mt-0.5 block text-xs text-ink-muted">{target.pay_note}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            PMU job ads ({freshAds.length})
          </p>
          {freshAds.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-accent/30 p-4 text-sm text-ink-muted">
              None yet. Set up job alerts for “micropigmentación”, “micropigmentadora”, “microblading” and “PMU” on
              InfoJobs, Indeed Spain, LinkedIn, Net-Empregos and Sapo Emprego, sent to your Gmail, and they show up
              here.
            </p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {freshAds.map((posting) => (
                <li key={posting.id} className="rounded-2xl border border-black/10 bg-card p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                        posting.score >= 60 ? "bg-accent text-white" : "bg-accent/10 text-accent"
                      )}
                      title="Fit, 0–100"
                    >
                      {posting.score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{posting.title}</p>
                      <p className="text-xs text-ink-muted">
                        {[
                          posting.company,
                          posting.location,
                          SOURCE_LABELS[posting.source],
                          `found ${dateTime(posting.created_at)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={posting.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white"
                    >
                      Open ad <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => onSetPostingStatus(posting.id, "applied"))}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" /> Applied
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => onSetPostingStatus(posting.id, "dismissed"))}
                      className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-ink-muted"
                    >
                      Not for me
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {runs.length > 0 && (
          <details className="mt-6 text-sm">
            <summary className="cursor-pointer font-semibold">Reports ({runs.length})</summary>
            <ul className="mt-2 grid gap-2">
              {runs.map((item) => (
                <li key={item.id}>
                  <details className="rounded-2xl border border-black/10 bg-background p-3">
                    <summary className="cursor-pointer text-xs font-semibold">
                      {dateTime(item.created_at)} · {item.trigger === "cron" ? "daily search" : "Search now"}
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-5">{item.report}</pre>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Accordion>

      <Accordion
        icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
        title="Permits for Spain and Portugal"
        subtitle="As an EU citizen you need no visa or work permit"
      >
        <ul className="grid gap-2 text-sm">
          <li>
            <strong>Spain:</strong> each region asks micropigmentation artists for a hygiene and sanitation course
            (often 16–35 hours, online in some regions), and the clinic needs the premises permit. Check the rules of
            the region you move to: Valencia (Costa Blanca), Andalusia (Costa del Sol), the Balearics (Mallorca), Madrid
            or Catalonia.
          </li>
          <li>
            <strong>Portugal:</strong> no PMU licence was found; the clinic&apos;s licence covers the premises. Ask the
            clinic what it needs from you.
          </li>
          <li>
            <strong>Working:</strong> as an employee, or self-employed (autónomo in Spain, trabalhador independente in
            Portugal) working freelance for the clinic. Ask which one each clinic offers.
          </li>
        </ul>
      </Accordion>

      <Accordion
        icon={<Store className="h-4 w-4" aria-hidden="true" />}
        title={`Clinics (${targets.length})`}
        subtitle="Best pay first. Open one to see the message and contact buttons."
        defaultOpen
        keepMounted
      >
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a clinic, town, service, email or note"
            aria-label="Search clinics"
            className="min-h-11 w-full rounded-full border border-accent/25 bg-card py-2 pl-9 pr-10 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((item) => {
            const n = item.statuses
              ? targets.filter((target) => item.statuses!.includes(target.status)).length
              : targets.length;
            const active = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                aria-pressed={active}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
                  active
                    ? "border-[#1B8A3A] bg-[#1B8A3A] text-white"
                    : "border-black/10 bg-card text-foreground hover:border-[#1B8A3A]/50"
                )}
              >
                {item.label} <span className={active ? "text-white/80" : "text-ink-muted"}>{n}</span>
              </button>
            );
          })}
        </div>
        {query.trim() && (
          <p className="mb-2 text-xs text-ink-muted">
            {shown.length} match{shown.length === 1 ? "" : "es"} for “{query.trim()}”
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {countries.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCountry(value)}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-semibold",
                country === value
                  ? "border-accent bg-accent text-white"
                  : "border-accent/20 bg-card text-foreground hover:border-accent/50"
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            aria-label="Type"
            value={kind}
            onChange={(event) => setKind(event.target.value as PmuKind | "all")}
            className="min-h-10 rounded-full border border-accent/20 bg-card px-4 text-sm"
          >
            <option value="all">All types</option>
            {PMU_KIND_VALUES.map((value) => (
              <option key={value} value={value}>
                {pmuKindLabels[value]}
              </option>
            ))}
          </select>
          <label className="flex min-h-10 items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={hideClosed} onChange={(event) => setHideClosed(event.target.checked)} />
            Hide declined
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={onlyNew} onChange={(event) => setOnlyNew(event.target.checked)} />
            New this week ({newCount})
          </label>
          {removedCount > 0 && (
            <label className="flex min-h-10 items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" checked={showRemoved} onChange={(event) => setShowRemoved(event.target.checked)} />
              Show removed ({removedCount})
            </label>
          )}
          <button
            type="button"
            onClick={() => setAdding((current) => !current)}
            className={cn(buttonVariants({ variant: "outline" }), "ml-auto min-h-10 px-4 text-sm")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        </div>

        {adding && (
          <div className="mt-4 grid gap-2 rounded-2xl border border-accent/20 bg-background p-4 sm:grid-cols-2">
            <select
              aria-label="Type"
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value as PmuKind })}
              className="min-h-11 rounded-xl border border-black/10 bg-card px-3 text-sm"
            >
              {PMU_KIND_VALUES.map((value) => (
                <option key={value} value={value}>
                  {pmuKindLabels[value]}
                </option>
              ))}
            </select>
            {(
              [
                ["name", "Name"],
                ["city", "City"],
                ["country", "Country"],
                ["website", "Website (optional)"],
                ["instagram", "Instagram handle (optional)"],
                ["whatsapp", "WhatsApp number (optional)"],
                ["email", "Email (optional)"],
                ["notes", "Notes (optional)"],
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                placeholder={label}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="py-2.5"
              />
            ))}
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              Pay
              <select
                value={form.pay_score}
                onChange={(event) => setForm({ ...form, pay_score: Number(event.target.value) })}
                className="min-h-11 rounded-xl border border-black/10 bg-card px-3 text-sm"
              >
                {[5, 4, 3, 2, 1].map((score) => (
                  <option key={score} value={score}>
                    {payDots(score)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !form.name.trim()}
              onClick={() =>
                run(async () => {
                  const result = await onAdd(form);
                  if (result.ok) {
                    setForm({ ...form, name: "", website: "", instagram: "", whatsapp: "", email: "", notes: "" });
                    setAdding(false);
                  }
                  return result;
                })
              }
              className={cn(buttonVariants({ variant: "primary" }), "min-h-11 bg-accent px-4 text-sm text-white")}
            >
              Save
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-accent/30 p-6 text-center text-sm text-ink-muted">
            Nothing here. Try another country, or add one.
          </p>
        ) : (
          <>
            {favourites.length > 0 && (
              <section className="mt-4 rounded-3xl border border-[#1B8A3A]/30 bg-[#E3F3E6] p-3 sm:p-4">
                <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-[#1B8A3A]">
                  <Star className="h-4 w-4 fill-current" aria-hidden="true" /> Favourites ({favourites.length})
                </h3>
                <ul className="mt-3 grid gap-3 lg:grid-cols-2">{favourites.map(renderCard)}</ul>
              </section>
            )}
            {others.length > 0 && <ul className="mt-4 grid gap-3 lg:grid-cols-2">{others.map(renderCard)}</ul>}
          </>
        )}
      </Accordion>

      <Accordion
        icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
        title="Progress"
        subtitle="Stages, and which channels and countries answer"
        keepMounted
      >
        <OverviewPanel targets={targets} activities={activities} />
      </Accordion>

      <Accordion
        icon={<Scale className="h-4 w-4" aria-hidden="true" />}
        title={`Offers (${targets.filter((target) => target.offer && Object.values(target.offer).some(Boolean)).length})`}
        subtitle="Side by side, with what's still to ask"
      >
        <OfferComparison targets={targets} />
      </Accordion>

      <Accordion
        icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
        title="Pay by market"
        subtitle="What the research found, best first"
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {PAY_GUIDE.map((item) => (
            <li key={item.market} className="rounded-2xl border border-black/10 bg-background p-3">
              <p className="text-sm font-semibold">{item.market}</p>
              <p className="text-lg font-semibold text-accent">{item.pay}</p>
              <p className="text-xs text-ink-muted">{item.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Pay data for PMU is thin everywhere. Clinics rarely publish it, so ask every employer the questions in the
          checklist.
        </p>
      </Accordion>

      <Accordion
        icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
        title="Before you say yes"
        subtitle="Questions for every offer, and red flags"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" /> Ask about
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {NEGOTIATION_CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-danger">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Walk away if
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {RED_FLAGS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 text-danger">×</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Accordion>

      <Accordion
        icon={<Camera className="h-4 w-4" aria-hidden="true" />}
        title="My details for messages"
        subtitle="Portfolio links and start date"
        keepMounted
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              key: "portfolio_instagram",
              label: "Instagram portfolio",
              placeholder: "https://www.instagram.com/beautysecretsbyolga",
            },
            {
              key: "portfolio_facebook",
              label: "Facebook portfolio",
              placeholder: "https://www.facebook.com/VippeExtensionsBergen/photos",
            },
            { key: "available_from", label: "Available from", placeholder: "December 2026" },
          ].map((field) => (
            <label key={field.key} className="grid gap-1 text-xs font-semibold text-ink-muted">
              {field.label}
              <Input
                placeholder={field.placeholder}
                value={profile[field.key] ?? ""}
                onChange={(event) => setProfile({ ...profile, [field.key]: event.target.value })}
                onBlur={(event) => saveField(field.key, event.target.value)}
                className="py-2"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">Left empty, the messages use the links from your portfolio PDF.</p>
      </Accordion>
    </div>
  );
}
