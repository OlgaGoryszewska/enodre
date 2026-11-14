"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Anchor id; the section opens when the URL hash points at it. */
  id?: string;
  /** Keep the content mounted while closed, so it keeps its state and listeners. */
  keepMounted?: boolean;
  /** A window event that opens the section and scrolls to it. */
  openOnEvent?: string;
}

// Collapsed by default so the dashboard reads as a stack of compact rows —
// each section is just an icon + title until you click to open it.
export function Accordion({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
  id,
  keepMounted = false,
  openOnEvent,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function reveal() {
      setOpen(true);
      // After the content has been laid out.
      setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    function revealOnHash() {
      if (id && window.location.hash === `#${id}`) reveal();
    }
    // Next's links change the hash without a hashchange event.
    function revealOnLink(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (id && link?.hash === `#${id}` && link.pathname === window.location.pathname) reveal();
    }
    const initial = setTimeout(revealOnHash, 0);
    window.addEventListener("hashchange", revealOnHash);
    document.addEventListener("click", revealOnLink);
    if (openOnEvent) window.addEventListener(openOnEvent, reveal);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("hashchange", revealOnHash);
      document.removeEventListener("click", revealOnLink);
      if (openOnEvent) window.removeEventListener(openOnEvent, reveal);
    };
  }, [id, openOnEvent]);

  return (
    <div ref={rootRef} id={id} className="scroll-mt-24 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
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

      {(open || keepMounted) && (
        <div hidden={!open} className="mt-6 border-t border-black/10 pt-6">
          {children}
        </div>
      )}
    </div>
  );
}
