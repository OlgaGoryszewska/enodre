"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bookmark } from "lucide-react";
import { applicantFromProfile, bookmarkletFor, fillPlan } from "@/lib/form-fill";

/**
 * The "Fill my application" bookmark: drag it to the bookmarks bar, then click
 * it on any application form. You press Apply, Next and Submit yourself.
 */
export function FillBookmark({ answers }: { answers: Record<string, string> }) {
  const href = useMemo(() => bookmarkletFor(fillPlan(applicantFromProfile(answers))), [answers]);
  const link = useRef<HTMLAnchorElement>(null);
  // React blocks javascript: links in href, so the bookmark's code is set directly.
  useEffect(() => {
    link.current?.setAttribute("href", href);
  }, [href]);

  return (
    <div className="mt-6 grid gap-2 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
      <p className="font-semibold">Fill application forms in one click</p>
      <ol className="list-decimal pl-5 text-xs leading-5 text-ink-muted">
        <li>Drag the button below to your bookmarks bar (once; drag it again after you change your answers).</li>
        <li>Open a job and press Apply or Easy Apply yourself, on LinkedIn, Indeed or the company&apos;s site.</li>
        <li>
          Click the bookmark on each step: it fills your name, email, phone, links, notice period and salary. Your CV
          and cover letter fields get a pink outline for you to add.
        </li>
        <li>Check everything, then press Next or Submit yourself. The bookmark never clicks anything.</li>
      </ol>
      <a
        ref={link}
        onClick={(event) => event.preventDefault()}
        draggable
        className="inline-flex w-fit cursor-grab items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
        title="Drag me to your bookmarks bar"
      >
        <Bookmark className="h-4 w-4" aria-hidden="true" /> Fill my application
      </a>
      <p className="text-xs text-ink-muted">
        Clicking the Apply button on Find jobs also copies that job&apos;s cover letter, ready to paste.
      </p>
    </div>
  );
}
