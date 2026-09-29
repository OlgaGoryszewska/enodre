"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const isPolish = pathname === "/pl" || pathname.startsWith("/pl/");
  const enHref = isPolish ? "/" : pathname;
  const plHref = isPolish ? pathname : "/pl";

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-black/10 p-1 text-xs font-semibold ${className ?? ""}`}>
      <Link
        href={enHref}
        aria-current={!isPolish}
        className={`rounded-full px-2.5 py-1 transition ${!isPolish ? "bg-foreground text-background" : "text-ink-muted hover:text-foreground"}`}
      >
        EN
      </Link>
      <Link
        href={plHref}
        aria-current={isPolish}
        className={`rounded-full px-2.5 py-1 transition ${isPolish ? "bg-foreground text-background" : "text-ink-muted hover:text-foreground"}`}
      >
        PL
      </Link>
    </div>
  );
}
