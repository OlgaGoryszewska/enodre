"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Route,
  Search,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { products } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

const lotos = products.find((product) => product.slug === "bialy-lotos")!;

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const palette = [
  { name: "Primary", hex: "#D5D5D9", role: "Cool neutral canvas, page backgrounds" },
  { name: "Ink", hex: "#3C3B3F", role: "Body copy, near-black" },
  { name: "Brown", hex: "#CB845C", role: "Warm accent, sits near skin tones" },
  { name: "Gold", hex: "#B5983F", role: "The brand's signature, lifted from the mark" },
  { name: "Lime", hex: "#FFF761", role: "One loud accent, reserved for the rare interrupt" },
];

const typeSpecimens = [
  { sample: "Piękno, które podkreśla Ciebie", label: "Poppins — UI & body", className: "font-sans font-semibold" },
  { sample: "Piękno, które podkreśla Ciebie", label: "DM Serif Display — homepage headlines", className: "font-serif italic" },
  { sample: "Biały lotos", label: "Bochan — the signature script", className: "font-serif italic" },
];

const routes = [
  { label: "Strona główna", path: "/" },
  { label: "Zabiegi", path: "/zabiegi" },
  { label: "Problemy", path: "/problemy/[slug]" },
  { label: "Cennik", path: "/cennik" },
  { label: "Sklep", path: "/sklep" },
  { label: "Galeria", path: "/galeria" },
  { label: "O nas", path: "/o-nas" },
  { label: "Blog", path: "/blog" },
  { label: "Kontakt", path: "/kontakt" },
];

const dataModules = [
  { file: "services.js", desc: "15 treatment pages" },
  { file: "problems.js", desc: "6 concern-led pages" },
  { file: "cennik.js", desc: "full price list" },
  { file: "effects.js + effectImages.js", desc: "before/after gallery" },
  { file: "products.js", desc: "9 vouchers & add-ons" },
];

const stats = [
  { n: "71", l: "Commits" },
  { n: "15", l: "Dynamic treatment pages" },
  { n: "6", l: "Problem-led pages" },
  { n: "1,144", l: "Lines of structured data" },
];

const engineeringFeatures = [
  {
    icon: Shield,
    title: "Consent-gated map embed",
    body: "The homepage's Google Maps embed doesn't load until a visitor accepts it. Consent is written to localStorage under a single key and broadcast via a CustomEvent, so every component reacting to privacy state — banner, map, footer link — stays in sync without a shared store.",
  },
  {
    icon: Search,
    title: "Search & expand on the price list",
    body: "Cennik covers PMU, cosmetology, laser, brows, lashes, makeup, and piercing — 24 laser variants alone. A live search filters services by name; each category collapses by default so the page stays scannable instead of becoming a wall of numbers.",
  },
  {
    icon: Route,
    title: "Problem-first navigation",
    body: "A parallel route tree (/problemy/[slug]) lets a visitor start from a concern — discoloration, loss of firmness, acne scars — and land on the treatments that address it, cross-linked back into the main catalog.",
  },
  {
    icon: Calendar,
    title: "Booking without a booking system",
    body: "No cart, no calendar to maintain — every treatment and voucher card resolves to the salon's existing Booksy profile, keeping scheduling logic entirely off this codebase.",
  },
  {
    icon: CheckCircle2,
    title: "Tested where it counts",
    body: "Jest and React Testing Library cover the homepage hero render, catching the one regression that would actually hurt: a broken first impression.",
  },
];

const outcomeChips = ["Gold lotus identity", "15 dynamic pages", "Problem-first navigation", "Shipped solo on Vercel"];

type Shot = { src: string; alt: string; caption: string; width: number; height: number; frame: "phone" | "browser" };

const DESKTOP = { width: 2664, height: 1768 } as const;

const heroShot: Shot = {
  src: "/lotos/Screenshot-bialy-lotos-desktop-04.png",
  alt: "Biały Lotos homepage — 'Piękno, które podkreśla Ciebie' headline beside a close-up beauty portrait, with a cookie-consent banner for the Google Maps embed.",
  caption: "Home — the opening line, and the portrait treatment that carries the whole site.",
  ...DESKTOP,
  frame: "browser",
};

const desktopShots: Shot[] = [
  {
    src: "/lotos/Screenshot-bialy-lotos-desktop-01.png",
    alt: "Zabiegi (treatments) hub page, opening with three close-up beauty portraits above the Makijaż Permanentny category.",
    caption: "Zabiegi — the treatments hub, leading with portraiture instead of a generic service list.",
    ...DESKTOP,
    frame: "browser",
  },
  {
    src: "/lotos/Screenshot-bialy-lotos-desktop-03.png",
    alt: "Zabiegi page showing five specialty cards — Makijaż Permanentny, HIFU, Laser Frakcyjny CO2, Depilacja Laserowa, and Usuwanie Makijażu Permanentnego — above the Sklep teaser section.",
    caption: "Five specialties, from permanent makeup to laser hair removal, each linking into its own detail page.",
    ...DESKTOP,
    frame: "browser",
  },
  {
    src: "/lotos/Screenshot-bialy-lotos-desktop-02.png",
    alt: "Sklep (shop) page showing a gift voucher, a premium voucher, and an aftercare cream product card.",
    caption: "Sklep — gift vouchers and aftercare, no cart required, ordered straight through the salon.",
    ...DESKTOP,
    frame: "browser",
  },
];

const mobileShots: Shot[] = [
  {
    src: "/lotos/Screenshot-bialy-lotos-mobile-04.png",
    alt: "Biały Lotos homepage on mobile, showing the 'Piękno, które podkreśla Ciebie' headline stacked above the trust line and call-to-action buttons.",
    caption: "The same homepage, tuned for a 390px viewport.",
    width: 732,
    height: 1528,
    frame: "phone",
  },
  {
    src: "/lotos/Screenshot-bialy-lotos-mobile-01.png",
    alt: "Cennik (price list) page on mobile, with a live search field and collapsible PMU category cards.",
    caption: "Cennik — a live search over a price list that would otherwise be a wall of numbers.",
    width: 732,
    height: 1560,
    frame: "phone",
  },
  {
    src: "/lotos/Screenshot-bialy-lotos-mobile-02.png",
    alt: "Treatment detail page for Makijaż permanentny on mobile, showing a portrait hero above the treatment description and a Brwi permanentne subsection.",
    caption: "Treatment detail — one of 15 pages generated from services.js.",
    width: 732,
    height: 1492,
    frame: "phone",
  },
  {
    src: "/lotos/Screenshot-bialy-lotos-mobile-03.png",
    alt: "O nas (about) page on mobile, showing a portrait of the two-person salon team above the heading 'Miejsce stworzone z myślą o spokojnym, świadomym pięknie'.",
    caption: "O nas — the two-person team behind the salon.",
    width: 732,
    height: 1528,
    frame: "phone",
  },
];

const galleryShots: Shot[] = [heroShot, ...desktopShots, ...mobileShots];

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[2rem] bg-foreground p-[7px] shadow-lg ${className}`}>
      <div className="relative overflow-hidden rounded-[1.55rem]">
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-foreground"
        />
      </div>
    </div>
  );
}

function BrowserFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-black/10 bg-card shadow-lg ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-black/10 px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-black/15" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-black/15" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-black/15" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

function FramedImage({
  shot,
  sizes,
  imageClassName = "h-auto w-full",
  wrapperClassName = "",
  priority = false,
}: {
  shot: Shot;
  sizes: string;
  imageClassName?: string;
  wrapperClassName?: string;
  priority?: boolean;
}) {
  const img = (
    <Image
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      sizes={sizes}
      priority={priority}
      quality={90}
      className={imageClassName}
    />
  );
  return shot.frame === "phone" ? (
    <PhoneFrame className={wrapperClassName}>{img}</PhoneFrame>
  ) : (
    <BrowserFrame className={wrapperClassName}>{img}</BrowserFrame>
  );
}

function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -30]);

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
            "radial-gradient(280px circle at var(--x, 50%) var(--y, 30%), rgba(181,152,63,0.35), transparent 70%)",
        }}
      />
      <motion.div style={{ y }} className="relative w-full drop-shadow-2xl">
        <FramedImage shot={heroShot} sizes="(min-width: 640px) 28rem, 90vw" priority />
      </motion.div>
    </div>
  );
}

function Lightbox({ shots, index, onClose, onStep }: { shots: Shot[]; index: number; onClose: () => void; onStep: (delta: number) => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, onStep]);

  const shot = shots[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-foreground/95 p-4 sm:p-10"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-background transition hover:bg-white/10 sm:right-8 sm:top-8"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStep(-1);
        }}
        aria-label="Previous screen"
        className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-background transition hover:bg-white/10 sm:left-6"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStep(1);
        }}
        aria-label="Next screen"
        className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-background transition hover:bg-white/10 sm:right-6"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="max-h-[80vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
        <FramedImage shot={shot} sizes="90vw" imageClassName="h-[70vh] w-auto object-contain" />
      </div>
      <p className="text-sm font-medium text-background/70">
        {shot.caption} · {index + 1} / {shots.length}
      </p>
    </motion.div>
  );
}

export function BialyLotosShowcase() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = (src: string) => setLightboxIndex(galleryShots.findIndex((s) => s.src === src));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(169,151,253,0.28),transparent_60%)] py-20 sm:py-28">
        <div className="shell">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/products" className="text-sm font-semibold text-ink-muted hover:text-foreground">
              ← All products
            </Link>
            {lotos.url && (
              <a
                href={lotos.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-foreground"
              >
                <span>Visit salonbialylotos.pl</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>

          <motion.div
            className="mt-12 grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-16"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <div>
              <motion.p variants={heroItem} className="eyebrow">
                Case study · {lotos.category} · {lotos.location}
              </motion.p>
              <motion.h1 variants={heroItem} className="display-title mt-6">
                {lotos.name}
              </motion.h1>
              <motion.p variants={heroItem} className="mt-6 text-xl font-medium text-ink-muted">
                {lotos.tagline}
              </motion.p>
              <motion.p variants={heroItem} className="mt-6 max-w-xl text-lg leading-8 text-ink-muted">
                {lotos.description}
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
                  href="#screens"
                  className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-background px-6 py-3 text-m font-semibold transition hover:bg-foreground/5"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" />
                  <span>See the site</span>
                </a>
              </motion.div>
            </div>

            <motion.div variants={heroItem}>
              <HeroVisual />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The brief */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">The brief</p>
            <ScrollRevealHeading
              text="A five-treatment business, one coherent site."
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-xl leading-7 text-ink-muted">
              Biały Lotos runs permanent makeup, premium cosmetology, laser hair removal, brow and lash styling,
              and piercing under one roof — five practices with different price structures, aftercare rules, and
              photographic proof of results.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-black/10 bg-background p-8 sm:p-10">
              <p className="eyebrow">What we were asked for</p>
              <p className="mt-6 leading-7 text-ink-muted">
                Not a landing page — a way for a client who already knows her <em>concern</em> (fading brows, sun
                damage, unwanted hair, a botched old PMU job) to find the right treatment, its price, its
                aftercare, and a Booksy booking link, without ever feeling like generic salon boilerplate.
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-6">
                <Sparkles className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                <p className="eyebrow">Designed and built solo by Enodre</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Identity */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The brand</p>
            <ScrollRevealHeading
              text="A lotus in gold foil."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              The mark had to read as premium — gold, not pastel — draw on the salon&apos;s name directly, and
              still hold up small, at 32px, in a mobile nav bar.
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mt-10 rounded-2xl border border-black/10 bg-card p-8 sm:p-10">
              <p className="eyebrow">Logo</p>
              <div className="mt-6 flex items-center justify-center rounded-xl bg-[#3C3B3F] p-10 sm:p-14">
                <Image
                  src="/lotos/logo.png"
                  alt="Biały Lotos logo — a gold foil lotus mark above a hand-lettered script wordmark reading 'Biały lotos'."
                  width={627}
                  height={681}
                  className="h-auto w-full max-w-[14rem]"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-6 flex flex-wrap gap-3">
              {palette.map((swatch) => (
                <div key={swatch.hex} className="flex items-center gap-3 rounded-xl border border-black/10 bg-card px-4 py-3">
                  <span
                    className="h-8 w-8 flex-none rounded-full border border-black/10"
                    style={{ backgroundColor: swatch.hex }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">{swatch.name}</p>
                    <p className="text-xs text-ink-muted">{swatch.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {typeSpecimens.map((spec) => (
                <div key={spec.label} className="rounded-2xl border border-black/10 bg-card p-6">
                  <p className={`text-xl ${spec.className}`}>{spec.sample}</p>
                  <p className="mt-4 text-xs text-ink-muted">{spec.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Information architecture */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Information architecture</p>
            <ScrollRevealHeading
              text="Pages that build themselves from data."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Every treatment and every client &ldquo;problem&rdquo; is a dynamic route rendered from a single
              structured dataset — not a hand-built page per service.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal delay={0.1}>
              <div className="h-full rounded-2xl border border-black/10 bg-background p-8">
                <p className="eyebrow">Routes</p>
                <ul className="mt-6 grid gap-3">
                  {routes.map((route) => (
                    <li key={route.path} className="flex items-center justify-between gap-4 border-t border-black/10 pt-3 first:border-t-0 first:pt-0">
                      <span className="text-sm">{route.label}</span>
                      <span className="font-mono text-xs text-ink-muted">{route.path}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="h-full rounded-2xl border border-black/10 bg-background p-8">
                <p className="eyebrow">Data modules</p>
                <ul className="mt-6 grid gap-3">
                  {dataModules.map((mod) => (
                    <li key={mod.file} className="flex items-center justify-between gap-4 border-t border-black/10 pt-3 first:border-t-0 first:pt-0">
                      <span className="font-mono text-xs">{mod.file}</span>
                      <span className="text-sm text-ink-muted">{mod.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="mt-6 grid grid-cols-2 gap-6 rounded-2xl border border-black/10 bg-background p-8 sm:grid-cols-4 sm:p-10">
              {stats.map((stat) => (
                <div key={stat.l} className="text-center">
                  <p className="display-title text-3xl sm:text-4xl">{stat.n}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">{stat.l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Screens */}
      <section id="screens" className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The site in use</p>
            <ScrollRevealHeading
              text="Live captures from the running build."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Desktop and mobile, catalog and detail. Click any screen to expand it.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
              {galleryShots.map((shot) => (
                <button
                  key={shot.src}
                  type="button"
                  onClick={() => openLightbox(shot.src)}
                  className="group block w-full break-inside-avoid text-left"
                >
                  <FramedImage
                    shot={shot}
                    sizes="(min-width: 1024px) 30vw, 45vw"
                    imageClassName="h-auto w-full transition duration-300 group-hover:scale-[1.03]"
                    wrapperClassName="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg"
                  />
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Engineering */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Engineering</p>
            <ScrollRevealHeading
              text="The parts that don't show up in a screenshot."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {engineeringFeatures.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 0.06}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-black/10 bg-background p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <Icon
                    className="pointer-events-none absolute -bottom-5 -right-5 h-28 w-28 text-accent/[0.07] transition duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110 group-hover:text-accent/[0.12]"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <div className="relative flex items-start justify-between">
                    <Icon
                      className="h-7 w-7 text-ink transition duration-300 group-hover:text-accent"
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs text-ink-muted/50">0{index + 1}</span>
                  </div>
                  <p className="relative mt-6 text-sm font-semibold">{title}</p>
                  <p className="relative mt-2 text-sm leading-6 text-ink-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stack & deployment */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Stack &amp; deployment</p>
            <ScrollRevealHeading
              text="Shipped on Vercel, from a git push."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Next.js page routing, Tailwind for the design system&apos;s utility layer, and a build pipeline
              that needs nothing more than a push to main.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-2">
              {lotos.stack.map((item) => (
                <span key={item} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted">
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-8 rounded-2xl bg-foreground p-8 font-mono text-xs leading-6 text-background sm:p-10">
              <p className="text-background/50">// vercel.json</p>
              <p className="mt-2">
                &quot;builds&quot;: [{"{"} &quot;src&quot;: &quot;package.json&quot;, &quot;use&quot;: <span className="text-accent">&quot;@vercel/next&quot;</span> {"}"}]
              </p>
              <p className="mt-4 text-background/50">installCommand</p>
              <p>npm install</p>
              <p className="mt-2 text-background/50">buildCommand</p>
              <p>npm run build</p>
              <p className="mt-2 text-background/50">runtime</p>
              <p>Node 24.x</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Outcome */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="rounded-2xl bg-foreground p-10 text-background sm:p-14">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Outcome</p>
              <p className="display-title mt-4 text-[2.5rem] sm:text-6xl">Built and shipped solo.</p>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">{lotos.outcome}</p>
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

      {/* Discovery CTA */}
      <section className="border-t border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Untangle complexity</p>
            <ScrollRevealHeading
              text="Need a site that turns a visitor's concern into a booking?"
              className="page-title mt-4 text-4xl sm:text-5xl"
            />
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

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            shots={galleryShots}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onStep={(delta) =>
              setLightboxIndex((current) => {
                if (current === null) return current;
                return (current + delta + galleryShots.length) % galleryShots.length;
              })
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
