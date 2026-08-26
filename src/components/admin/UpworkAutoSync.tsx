import Link from "next/link";
import { Link2, TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpworkAutoSyncProps {
  connected: boolean;
  error?: "config" | "state_mismatch" | "exchange_failed";
}

const ERROR_MESSAGES: Record<NonNullable<UpworkAutoSyncProps["error"]>, string> = {
  config: "Missing Upwork API credentials — check UPWORK_CLIENT_ID/SECRET/REDIRECT_URI.",
  state_mismatch: "Couldn't verify the Upwork authorization request. Try connecting again.",
  exchange_failed: "Upwork rejected the authorization. Try connecting again.",
};

export function UpworkAutoSync({ connected, error }: UpworkAutoSyncProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Upwork auto-sync</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Connect your Upwork account to fetch new matches automatically (coming soon)
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{ERROR_MESSAGES[error]}</span>
        </div>
      )}

      {connected ? (
        <p className="mt-5 text-sm text-ink-muted">
          Connected. Job matching is being wired up next.
        </p>
      ) : (
        <Link
          href="/admin/upwork/connect"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Connect Upwork
        </Link>
      )}
    </div>
  );
}
