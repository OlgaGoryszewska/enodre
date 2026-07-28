"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  Camera,
  Database,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sheet,
  Sparkles,
  Wifi,
} from "lucide-react";
import { products } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

const fuelflo = products.find((product) => product.slug === "fuelflo")!;

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const beforeItems = [
  { icon: FileText, label: "Paper job logs" },
  { icon: MessageCircle, label: "Group chats & calls" },
  { icon: Sheet, label: "Spreadsheets" },
  { icon: ImageIcon, label: "Scattered photos" },
];

const flowSteps = [
  {
    number: "01",
    title: "Scan the asset",
    body: "Every delivery starts by identifying the exact generator or tank being fuelled.",
  },
  {
    number: "02",
    title: "Record readings",
    body: "Technicians log meter readings on site — no separate paperwork afterward.",
  },
  {
    number: "03",
    title: "Capture photo evidence",
    body: "Photos are tied to the asset, the technician, and the moment they were taken.",
  },
  {
    number: "04",
    title: "Sync in real time",
    body: "Data syncs the moment a connection is available — no manual upload step.",
  },
  {
    number: "05",
    title: "Review & report",
    body: "Managers review verified deliveries and generate client-ready PDF reports in seconds.",
  },
];

const readinessChecks = [
  { icon: Database, label: "Local database", detail: "2 projects saved, 0 queued" },
  { icon: ShieldCheck, label: "Evidence storage", detail: "Write, read, and cleanup passed" },
  { icon: Camera, label: "Camera permission", detail: "Camera permission granted" },
  { icon: MapPin, label: "GPS capture", detail: "7m accuracy" },
  { icon: Wifi, label: "FuelFlo API", detail: "2 projects synced from API" },
];

const outcomeChips = ["GPS-verified", "Timestamped", "Photo-backed", "Seconds, not hours"];

const impactPoints = [
  "Designed, built, and shipped end to end by Enodre — from field UX to offline sync.",
  "Offline-first from day one — the app is fully usable with no signal.",
  "GPS, timestamp, and photo evidence tied to every fuel action.",
  "Client-ready PDF reporting, generated in seconds.",
];

const untangled = [
  "Replaced paper logs, spreadsheets, and scattered photos with one verified field-to-report flow.",
  "Made unreliable site connectivity a non-issue — every action is captured and stored locally, then synced the moment a connection returns.",
  "Turned raw field data into client-ready, billing-grade evidence in seconds instead of hours.",
];

function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div
      ref={ref}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        event.currentTarget.style.setProperty("--y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }}
      className="relative isolate flex items-center justify-center overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(280px circle at var(--x, 50%) var(--y, 30%), rgba(169,151,253,0.35), transparent 70%)",
        }}
      />
      <motion.div style={{ y }} className="relative w-full max-w-[19rem] rotate-[3deg] drop-shadow-2xl sm:max-w-sm">
        <Image
          src={fuelflo.image!}
          alt={fuelflo.imageAlt ?? ""}
          width={1080}
          height={1080}
          priority
          sizes="(min-width: 640px) 24rem, 80vw"
          className="h-auto w-full rounded-[2rem]"
        />
      </motion.div>
    </div>
  );
}

export function FuelFloShowcase() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(169,151,253,0.28),transparent_60%)] py-20 sm:py-28">
        <div className="shell">
          <Link href="/products" className="text-sm font-semibold text-ink-muted hover:text-foreground">
            ← All products
          </Link>

          <motion.div
            className="mt-12 grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <div>
              <motion.p variants={heroItem} className="eyebrow">
                Flagship product · {fuelflo.category}
              </motion.p>
              <motion.h1 variants={heroItem} className="display-title mt-6">
                {fuelflo.name}
              </motion.h1>
              <motion.p variants={heroItem} className="mt-6 text-xl font-medium text-ink-muted">
                {fuelflo.tagline}
              </motion.p>
              <motion.p variants={heroItem} className="mt-6 max-w-xl text-lg leading-8 text-ink-muted">
                Paper logs, scattered photos, and disputed invoices became one verified, timestamped record of
                every fuel delivery — captured in the field, synced the moment connectivity returns.
              </motion.p>
              <motion.div variants={heroItem} className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/#get-in-touch"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-m font-semibold text-background transition hover:opacity-90"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
                  <span>Book a discovery call</span>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-background px-6 py-3 text-m font-semibold transition hover:bg-foreground/5"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" />
                  <span>See how it works</span>
                </a>
              </motion.div>
            </div>
            <motion.div variants={heroItem}>
              <HeroVisual />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The challenge */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">The challenge</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Every fuel delivery told a different story.
            </h2>
            <p className="mt-6 max-w-xl leading-7 text-ink-muted">{fuelflo.description}</p>
            <p className="mt-4 max-w-xl leading-7 text-ink-muted">
              Missing or unclear records led to disputed fuel usage, slower invoicing, and weaker customer trust.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-black/10 p-8 sm:p-10">
              <p className="eyebrow">Before</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {beforeItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-black/10 bg-background px-4 py-3">
                    <Icon className="h-4 w-4 flex-none text-ink-muted" aria-hidden="true" />
                    <span className="text-sm font-medium text-ink-muted">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-6">
                <Sparkles className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                <p className="eyebrow">After — FuelFlo: one verified record per delivery</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              A field-to-report flow, from asset to invoice.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-5">
            {flowSteps.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.08} className="bg-card p-7">
                <p className="font-mono text-xs font-semibold text-accent">{step.number}</p>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Built for offline */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-black/10 lg:mx-0">
              <Image
                src={fuelflo.image!}
                alt={fuelflo.imageAlt ?? ""}
                width={1080}
                height={1080}
                sizes="(min-width: 1024px) 320px, 70vw"
                className="h-auto w-full"
              />
            </div>
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow">Built for the field</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Proof that works with no signal.
              </h2>
              <p className="mt-6 max-w-lg leading-7 text-ink-muted">
                Every field visit starts with a readiness check most users never have to think about. This is the
                actual screen a technician sees before starting work — five things confirmed, offline, before a
                single delivery is logged.
              </p>
            </Reveal>
            <div className="mt-8 grid gap-3">
              {readinessChecks.map(({ icon: Icon, label, detail }, index) => (
                <Reveal key={label} delay={index * 0.06}>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-background px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-none text-ink-muted" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-ink-muted">{detail}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      Ready
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Outcome */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="rounded-2xl bg-foreground p-10 text-background sm:p-14">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Outcome</p>
              <p className="display-title mt-4 text-[2.5rem] sm:text-6xl">Built and pilot-ready.</p>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">{fuelflo.outcome}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {outcomeChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-background/80">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tech & impact */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">Built solo, end to end</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">One stack, offline by design.</h2>
            <ul className="mt-6 grid gap-4">
              {impactPoints.map((point) => (
                <li key={point} className="flex gap-3 border-t border-black/10 pt-4 leading-7 text-ink-muted first:border-t-0 first:pt-0">
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow">Stack</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {fuelflo.stack.map((item) => (
                <span key={item} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted">
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* What we untangled */}
      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">What we untangled</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              The transformation, in three moves.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {untangled.map((point, index) => (
              <Reveal key={point} delay={index * 0.08}>
                <div className="h-full rounded-2xl border border-black/10 p-7">
                  <p className="font-mono text-xs font-semibold text-accent">0{index + 1}</p>
                  <p className="mt-4 leading-7 text-ink-muted">{point}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Discovery CTA */}
      <section className="border-t border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Untangle complexity</p>
            <h2 className="page-title mt-4 text-4xl sm:text-5xl">
              Still running critical operations through paper and spreadsheets?
            </h2>
            <p className="mt-6 text-lg leading-8 text-ink-muted">Let&apos;s untangle it.</p>
            <Link
              href="/#get-in-touch"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-m font-semibold text-background transition hover:opacity-90"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
              <span>Book a discovery call</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
