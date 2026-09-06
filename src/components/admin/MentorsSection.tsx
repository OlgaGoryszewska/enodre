import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Customer } from "@/lib/customer";

interface MentorsSectionProps {
  mentors: Customer[];
}

// A plain filtered view of the same people list — server-rendered, no
// interactivity needed, so no "use client" here.
export function MentorsSection({ mentors }: MentorsSectionProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Mentors &amp; Advisors</h2>
      <p className="mt-1 text-sm text-ink-muted">People tagged as a mentor or advisor</p>

      {mentors.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">No mentors or advisors tagged yet.</p>
      ) : (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {mentors.map((person) => (
            <li key={person.id}>
              <Link
                href={`/admin/people/${person.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-background p-3 transition hover:border-black/25"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  {person.company && (
                    <span className="block truncate text-xs text-ink-muted">{person.company}</span>
                  )}
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
