"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Building2,
  ExternalLink,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Accordion } from "@/components/admin/Accordion";
import { cn } from "@/lib/utils";
import {
  COMPANY_STATUS_VALUES,
  companyPath,
  companyStatusLabels,
  inTalks,
  type CompanyRow,
  type CompanyStatus,
} from "@/lib/application-search";

export type UpdateCompany = (input: {
  company: string;
  status?: CompanyStatus | null;
  hidden?: boolean;
}) => Promise<{ ok: boolean; error: string | null }>;

type Change = { status?: CompanyStatus | null; hidden?: boolean };

const MIN_LENGTH = 2;
const TYPING_PAUSE_MS = 300;

// Yours to act on stands out; closed doors fade.
const STATUS_STYLES: Record<string, string> = {
  "Contact them": "bg-[#FFF1C2] text-[#8A6100]",
  Replied: "bg-[#E3F3E6] text-[#1B8A3A]",
  "In talks": "bg-[#E3F3E6] text-[#1B8A3A]",
  Interview: "bg-[#E3F3E6] text-[#1B8A3A]",
  Interviewing: "bg-[#E3F3E6] text-[#1B8A3A]",
  Offer: "bg-[#E3F3E6] text-[#1B8A3A]",
  Declined: "bg-danger/10 text-danger",
  Rejected: "bg-danger/10 text-danger",
};

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Oslo",
  });

function CompanyTable({
  rows: unsorted,
  onUpdate,
  showHidden = false,
}: {
  rows: CompanyRow[];
  onUpdate: UpdateCompany;
  /** Search results keep removed companies, with a way back. */
  showHidden?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "company">("date");
  // Changes made here, shown at once while the page catches up.
  const [changes, setChanges] = useState<Record<string, Change>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      unsorted
        .map((row) => {
          const change = row.key ? changes[row.key] : undefined;
          if (!change) return row;
          const tracked = change.status !== undefined ? change.status : (row.tracked ?? null);
          return {
            ...row,
            tracked,
            status: tracked ? companyStatusLabels[tracked] : (row.autoStatus ?? row.status),
            hidden: change.hidden ?? row.hidden,
          };
        })
        .filter((row) => showHidden || !row.hidden)
        .sort((a, b) =>
          sortBy === "company" ? a.company.localeCompare(b.company) : (b.date ?? "").localeCompare(a.date ?? "")
        ),
    [unsorted, changes, showHidden, sortBy]
  );

  async function change(row: CompanyRow, next: Change) {
    if (!row.key) return;
    const key = row.key;
    setBusyKey(key);
    setError(null);
    const previous = changes[key];
    setChanges((current) => ({ ...current, [key]: { ...current[key], ...next } }));
    try {
      const result = await onUpdate({ company: row.company, ...next });
      if (!result.ok) throw new Error(result.error ?? "Couldn't save.");
    } catch (err) {
      setChanges((current) => ({ ...current, [key]: previous ?? {} }));
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusyKey(null);
    }
  }

  const sortButton = (column: "date" | "company", label: string) => (
    <button
      type="button"
      onClick={() => setSortBy(column)}
      className={cn("inline-flex items-center gap-1 font-semibold", sortBy === column && "text-foreground")}
    >
      {label}
      {sortBy === column && <ArrowDown className="h-3 w-3" aria-hidden="true" />}
    </button>
  );

  return (
    <>
      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
      <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-black/10 bg-background">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-background text-ink-muted">
            <tr className="border-b border-black/10">
              <th className="px-3 py-2 font-semibold">Nr</th>
              <th className="px-3 py-2">{sortButton("company", "Company")}</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">About</th>
              <th className="px-3 py-2 font-semibold">Contact</th>
              <th className="px-3 py-2">{sortButton("date", "Date")}</th>
              <th className="px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Fragment key={row.id}>
                <tr className="border-b border-black/5 align-top">
                  <td className="px-3 py-2 tabular-nums text-ink-muted">{index + 1}</td>
                  <td className="px-3 py-2">
                    {row.key ? (
                      <Link href={companyPath(row.key)} className="text-sm font-semibold hover:underline">
                        {row.company}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">{row.company}</span>
                    )}
                    {row.note && <p className="mt-0.5 max-w-56 truncate text-[#8A6100]">{row.note}</p>}
                  </td>
                  <td className="px-3 py-2">
                    {row.key ? (
                      <select
                        aria-label={`Status of ${row.company}`}
                        value={row.tracked ?? ""}
                        disabled={busyKey === row.key}
                        onChange={(event) =>
                          void change(row, { status: (event.target.value || null) as CompanyStatus | null })
                        }
                        className={cn(
                          "max-w-40 rounded-full border-0 px-2 py-0.5 font-semibold",
                          STATUS_STYLES[row.status ?? ""] ?? "bg-black/5"
                        )}
                      >
                        <option value="">{row.autoStatus ? `${row.autoStatus} (auto)` : "Not set"}</option>
                        {COMPANY_STATUS_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {companyStatusLabels[value]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.status && (
                        <span
                          className={cn(
                            "whitespace-nowrap rounded-full px-2 py-0.5 font-semibold capitalize",
                            STATUS_STYLES[row.status] ?? "bg-black/5"
                          )}
                        >
                          {row.status}
                        </span>
                      )
                    )}
                  </td>
                  <td className="px-3 py-2">{row.what}</td>
                  <td className="break-all px-3 py-2 text-ink-muted">{row.contact}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{row.date && shortDate(row.date)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      {row.text && (
                        <button
                          type="button"
                          onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                          className="font-semibold text-ink-muted hover:text-foreground"
                        >
                          {openId === row.id ? "Hide" : "Show text"}
                        </button>
                      )}
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-foreground"
                        >
                          Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {row.key &&
                        (row.hidden ? (
                          <button
                            type="button"
                            disabled={busyKey === row.key}
                            onClick={() => void change(row, { hidden: false })}
                            title="Back in the list"
                            className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-foreground"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyKey === row.key}
                            onClick={() => {
                              if (window.confirm(`Remove ${row.company} from the list? Search still finds it.`)) {
                                void change(row, { hidden: true });
                              }
                            }}
                            aria-label={`Remove ${row.company} from the list`}
                            className="text-ink-muted hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
                {openId === row.id && row.text && (
                  <tr className="border-b border-black/5">
                    <td colSpan={7} className="px-3 pb-3">
                      <pre className="whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 font-sans leading-5">
                        {row.text}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * The companies table: everyone we've messaged, or what a search finds, e.g.
 * when a company replies to an application.
 */
export function ApplicationSearch({
  companies,
  onSearch,
  onUpdate,
}: {
  companies: CompanyRow[];
  onSearch: (term: string) => Promise<{ hits: CompanyRow[]; failed: string[] }>;
  onUpdate: UpdateCompany;
}) {
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<{ term: string; hits: CompanyRow[]; failed: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    const query = term.trim();
    const request = ++latest.current;
    if (query.length < MIN_LENGTH) return;
    const timer = setTimeout(() => {
      setSearching(true);
      setError(null);
      onSearch(query)
        .then((found) => {
          if (request === latest.current) setResult({ term: query, ...found });
        })
        .catch(() => {
          if (request === latest.current) setError("The search failed. Try again.");
        })
        .finally(() => {
          if (request === latest.current) setSearching(false);
        });
    }, TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [term, onSearch]);

  const active = term.trim().length >= MIN_LENGTH;
  const showResults = active && result !== null;

  const rows = showResults ? result.hits : companies;
  const talking = inTalks(companies);

  return (
    <div className="grid gap-6">
      <Accordion
        icon={<MessagesSquare className="h-4 w-4" aria-hidden="true" />}
        title={`In talks (${talking.length})`}
        subtitle="Companies that answered or that you're talking to"
        defaultOpen
        keepMounted
      >
        {talking.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
            Nobody yet. Set a status on a company&apos;s page and it shows here.
          </p>
        ) : (
          <CompanyTable rows={talking} onUpdate={onUpdate} />
        )}
      </Accordion>

      <Accordion
        icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
        title="Companies & recruiters"
        subtitle={
          showResults
            ? `${rows.length} result${rows.length === 1 ? "" : "s"} for “${result.term}” across everything on this page.`
            : `${companies.length} compan${companies.length === 1 ? "y" : "ies"} and recruiters we've contacted. Search finds anyone on this page.`
        }
        defaultOpen
        keepMounted
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
            }}
            placeholder="Search a company, recruiter, job title or email address"
            aria-label="Search applications"
            className="w-full rounded-xl border border-black/10 bg-background py-2.5 pl-9 pr-9 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {active && searching ? (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" />
          ) : (
            term && (
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  setResult(null);
                  setError(null);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-3 text-ink-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {active && error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
        {showResults && result.failed.length > 0 && (
          <p className="mt-3 text-xs text-danger">Couldn&apos;t search {result.failed.join(", ")}.</p>
        )}

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
            {showResults ? `Nothing found for “${result.term}”.` : "No messages sent yet."}
          </p>
        ) : (
          <CompanyTable rows={rows} onUpdate={onUpdate} showHidden={showResults} />
        )}
      </Accordion>
    </div>
  );
}
