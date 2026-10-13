"use client";

import { useState } from "react";
import { ListPlus, Loader2 } from "lucide-react";

export function GtmTasksButton({ onAdd, allAdded }: { onAdd: () => Promise<{ added: number }>; allAdded: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setPending(true);
    setMessage(null);
    try {
      const { added } = await onAdd();
      setMessage(added === 0 ? "All GTM to-dos are already on the board." : `Added ${added} to-dos to the board below.`);
    } catch {
      setMessage("Couldn't add the to-dos. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void add()}
        disabled={pending || allAdded}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/20 px-4 py-2 text-sm font-semibold transition hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ListPlus className="h-4 w-4" aria-hidden="true" />}
        {allAdded ? "GTM to-dos are on the board" : "Add GTM to-dos to the board"}
      </button>
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
