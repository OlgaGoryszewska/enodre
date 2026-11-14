import Link from "next/link";
import { Inbox } from "lucide-react";
import { companyPath } from "@/lib/application-search";

export type LatestReply = {
  id: string;
  kind: "lead" | "job";
  from_email: string;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  snippet: string | null;
  lead_id: string | null;
  company_key: string | null;
  company: string | null;
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Oslo" });

/** The newest replies from people we wrote to, on the main dashboard. */
export function LatestReplies({ replies }: { replies: LatestReply[] }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Inbox className="h-5 w-5 text-accent" aria-hidden="true" /> Latest replies
        </h2>
        <Link href="/admin/linkedin" className="text-sm font-semibold text-ink-muted hover:text-foreground">
          Check replies →
        </Link>
      </div>
      {replies.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          None yet. Click Check replies on Applying for jobs, or wait for the morning check.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {replies.map((reply) => {
            const href = reply.lead_id
              ? `/admin/marketing/leads/${reply.lead_id}`
              : reply.company_key
                ? companyPath(reply.company_key)
                : null;
            const name = reply.company ?? reply.from_email;
            return (
              <li key={reply.id} className="rounded-xl border border-black/10 bg-background p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {href ? (
                    <Link href={href} className="font-semibold hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{name}</span>
                  )}
                  <span className="text-xs text-ink-muted">
                    {reply.kind === "lead" ? "Customer" : "Job search"} · {reply.from_name ?? reply.from_email}
                  </span>
                  <span className="ml-auto text-xs text-ink-muted">{shortDate(reply.received_at)}</span>
                </div>
                {reply.subject && <p className="mt-1 text-xs font-medium">{reply.subject}</p>}
                {reply.snippet && <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{reply.snippet}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
