"use client";

import Link from "next/link";
import { ArrowUp, DoorOpen } from "lucide-react";
import { expertiseAreas, industries, technologies } from "@/lib/content";

const COMPANY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Case studies" },
  { href: "/#get-in-touch", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export function SiteFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-black/10 bg-foreground text-background">
      <div className="shell grid gap-10 py-16 sm:grid-cols-2 sm:py-20 lg:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-background/50">Company</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-background/80 transition hover:text-background">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-background/50">Industries</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {industries.map((industry) => (
              <li key={industry.title}>
                <Link href="/#industries" className="text-background/80 transition hover:text-background">
                  {industry.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-background/50">Services</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {expertiseAreas.map((area) => (
              <li key={area.title}>
                <Link href="/#services" className="text-background/80 transition hover:text-background">
                  {area.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-background/50">Technologies</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {technologies.map((tech) => (
              <li key={tech} className="text-background/80">
                {tech}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="shell flex flex-col gap-4 py-6 text-sm text-background/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <p>© {new Date().getFullYear()} Enodre. All rights reserved.</p>
            <a href="mailto:info@enodre.com" className="transition hover:text-background">
              info@enodre.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" aria-label="Admin" className="transition hover:text-background">
              <DoorOpen className="h-5 w-5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-background/20 transition hover:bg-background/10 hover:text-background"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
