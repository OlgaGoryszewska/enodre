import { ArrowUpRight, Sparkles } from "lucide-react";
import type { AiJobMatch } from "@/lib/ai-job-matches";

interface AiJobMatchesProps {
  matches: AiJobMatch[];
}

export function AiJobMatches({ matches }: AiJobMatchesProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">AI job matches</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Searched daily on Upwork and LinkedIn against your profile
      </p>

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
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {match.company}
                      {match.source && ` · ${match.source}`}
                    </p>
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
    </div>
  );
}
