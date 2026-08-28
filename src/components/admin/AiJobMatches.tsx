import { ArrowUpRight, Receipt, Sparkles } from "lucide-react";
import type { AiJobMatch } from "@/lib/ai-job-matches";
import type { AiSearchRun } from "@/lib/ai-search-runs";

interface AiJobMatchesProps {
  heading: string;
  subtitle: string;
  matches: AiJobMatch[];
  lastRun: AiSearchRun | null;
  monthToDateSpendUsd: number;
}

function formatUsd(value: number) {
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

export function AiJobMatches({
  heading,
  subtitle,
  matches,
  lastRun,
  monthToDateSpendUsd,
}: AiJobMatchesProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

      {matches.length > 0 ? (
        <ul className="mt-6 divide-y divide-black/10 border-t border-black/10">
          {matches.map((match) => (
            <li key={match.id} className="py-4">
              <a
                href={match.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-1.5"
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium transition group-hover:text-accent">
                    {match.title}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </span>
                  {match.company && (
                    <p className="mt-0.5 text-sm text-ink-muted">{match.company}</p>
                  )}
                  {match.reasoning && (
                    <p className="mt-1.5 text-sm text-ink-muted">{match.reasoning}</p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">No strong matches found today.</p>
      )}

      {lastRun && (
        <div className="mt-6 rounded-xl border border-black/10 bg-background p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            Last search spend report
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span>
              <span className="font-medium text-foreground">{formatUsd(lastRun.estimated_cost_usd)}</span>{" "}
              estimated
            </span>
            <span>{lastRun.model}</span>
            <span>{lastRun.input_tokens.toLocaleString()} input tokens</span>
            <span>{lastRun.output_tokens.toLocaleString()} output tokens</span>
            <span>{lastRun.web_search_requests} web searches</span>
            <span>{lastRun.web_fetch_requests} pages verified</span>
            <span>{lastRun.matches_found} matches found</span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">{formatUsd(monthToDateSpendUsd)} spent this month</p>
        </div>
      )}
    </div>
  );
}
