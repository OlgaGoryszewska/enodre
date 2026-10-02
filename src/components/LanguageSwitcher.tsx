"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LOCALES = [
  { code: "en", label: "EN", prefix: null },
  { code: "pl", label: "PL", prefix: "/pl" },
  { code: "no", label: "NO", prefix: "/no" },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();

  const current = LOCALES.find((locale) => locale.prefix && (pathname === locale.prefix || pathname.startsWith(`${locale.prefix}/`)))?.code ?? "en";

  const hrefFor = (code: (typeof LOCALES)[number]["code"]) => {
    if (code === current) return pathname;
    const activePrefix = LOCALES.find((locale) => locale.code === current)?.prefix;
    const rest = activePrefix ? pathname.slice(activePrefix.length) || "/" : pathname;
    const targetPrefix = LOCALES.find((locale) => locale.code === code)?.prefix;
    return targetPrefix ? `${targetPrefix}${rest === "/" ? "" : rest}` : rest;
  };

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full border border-black/10 p-0.5 text-[10px] font-semibold ${className ?? ""}`}>
      {LOCALES.map((locale) => (
        <Link
          key={locale.code}
          href={hrefFor(locale.code)}
          aria-current={current === locale.code}
          className={`rounded-full px-1.5 py-0.5 transition ${
            current === locale.code ? "bg-foreground text-background" : "text-ink-muted hover:text-foreground"
          }`}
        >
          {locale.label}
        </Link>
      ))}
    </div>
  );
}
