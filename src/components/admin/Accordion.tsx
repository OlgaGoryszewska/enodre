"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Collapsed by default so the dashboard reads as a stack of compact rows —
// each section is just an icon + title until you click to open it.
export function Accordion({ icon, title, subtitle, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"
            aria-hidden="true"
          >
            {icon}
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">{title}</span>
            {subtitle && <span className="block text-sm text-ink-muted">{subtitle}</span>}
          </span>
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && <div className="mt-6 border-t border-black/10 pt-6">{children}</div>}
    </div>
  );
}
