"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, DoorOpen, X } from "lucide-react";
import { expertiseAreas, industries, technologies } from "@/lib/content";

type NavItem =
  | { label: string; href: string }
  | { label: string; items: { label: string; href: string }[] };

const NAV_ITEMS: NavItem[] = [
  { label: "Industries", items: industries.map((industry) => ({ label: industry.title, href: "/#industries" })) },
  {
    label: "Services",
    items: [
      { label: "All Services", href: "/services" },
      ...expertiseAreas.map((area) => ({ label: area.title, href: `/services/${area.slug}` })),
    ],
  },
  { label: "Technologies", items: technologies.map((tech) => ({ label: tech, href: "/#stack" })) },
  { label: "Cases", href: "/products" },
  { label: "FAQ", href: "/faq" },
  { label: "About Us", href: "/#about" },
];

function DesktopDropdown({ label, items }: { label: string; items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="nav-link flex items-center gap-1"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-black/10 bg-card p-4 shadow-xl"
          >
            <div className="grid max-h-80 gap-1 overflow-y-auto">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-foreground/5 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavSection({ label, items, onNavigate }: { label: string; items: { label: string; href: string }[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-black/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between py-5 text-2xl font-semibold tracking-tight"
      >
        {label}
        <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid gap-1 pb-5">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  className="rounded-lg px-1 py-2 text-base text-ink-muted transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-transparent">
      <div className="shell flex h-20 items-center justify-between">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
          <Image
            src="/logo-border-enodre.png"
            alt=""
            width={1230}
            height={1278}
            className="h-7 w-auto"
          />
          <span className="font-poppins text-lg font-medium tracking-tight">enodre</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden gap-5 text-sm font-medium sm:flex sm:items-center sm:gap-6">
          {NAV_ITEMS.map((item) =>
            "items" in item ? (
              <DesktopDropdown key={item.label} label={item.label} items={item.items} />
            ) : (
              <Link key={item.href} className="nav-link" href={item.href}>
                {item.label}
              </Link>
            )
          )}
          <Link
            href="/#get-in-touch"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Contact Us
          </Link>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-foreground/5 sm:hidden"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none" aria-hidden="true">
              <line x1="0" y1="1.25" x2="26" y2="1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1="8.75" x2="26" y2="8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-20 bottom-0 z-40 overflow-y-auto bg-background sm:hidden"
          >
            <motion.nav
              aria-label="Mobile"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="shell flex flex-col gap-1 pt-4 pb-24"
            >
              {NAV_ITEMS.map((item) =>
                "items" in item ? (
                  <MobileNavSection key={item.label} label={item.label} items={item.items} onNavigate={() => setOpen(false)} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-black/10 py-5 text-2xl font-semibold tracking-tight"
                  >
                    {item.label}
                  </Link>
                )
              )}
              <Link
                href="/#get-in-touch"
                onClick={() => setOpen(false)}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
              >
                Contact Us
              </Link>
            </motion.nav>

            <Link
              href="/login"
              aria-label="Admin"
              onClick={() => setOpen(false)}
              className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full text-foreground/15 transition hover:text-accent"
            >
              <DoorOpen className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
