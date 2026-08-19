"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, Receipt, ShieldCheck, Sparkles, X } from "lucide-react";
import { products } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

const nick = products.find((product) => product.slug === "nick-whittaker-imagery")!;

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const palette = [
  { name: "Abyss", hex: "#0a1620" },
  { name: "Teal", hex: "#1d4e5c" },
  { name: "Tide", hex: "#3e7e8c" },
  { name: "Copper", hex: "#d69a52" },
  { name: "Silver", hex: "#c7cfcc" },
  { name: "Paper", hex: "#ece6d8" },
  { name: "Foam", hex: "#f5f2ea" },
  { name: "Ink", hex: "#1a1d1e" },
];

const whatWeDid = [
  "Designed a full brand identity — logo, palette, and voice — inspired directly by the artist's own photography, so the site feels like a natural extension of the work, not a template.",
  "Built a gallery-style site that speaks to interior designers and hospitality buyers — the trade audience actually commissioning large-scale photography for real spaces, not casual retail shoppers.",
  "Created dozens of custom room-context images — each piece styled in real interior and hospitality spaces — so a buyer can picture exactly how it will look before they commit.",
  "Set up secure checkout so buyers can order with confidence, and orders are only ever marked paid once payment is genuinely confirmed.",
  "Handled New Zealand pricing and tax correctly from day one, so what buyers see at checkout is exactly what they pay.",
  "Delivered a system the client can run and grow on their own, without ongoing dependence on us.",
];

const orderSteps = [
  { number: "01", title: "Browse & choose", body: "Buyers pick a piece, size, and framing option, with pricing shown clearly upfront." },
  { number: "02", title: "Checkout", body: "A simple, guest-friendly checkout — no account required to place an order." },
  { number: "03", title: "Secure payment", body: "Payment is handled by Stripe's own secure checkout page — card details never touch our servers." },
  { number: "04", title: "Order confirmed", body: "Once payment is genuinely verified, the order is marked paid and the buyer gets a confirmation email." },
];

const outcomeChips = ["Custom brand identity", "Room-context imagery", "Trustworthy checkout", "NZ-accurate pricing"];

type Shot = { src: string; alt: string; caption: string; width: number; height: number; frame: "phone" | "browser" };

const DESK = { width: 2894, height: 1788 } as const;
const MOB = { width: 1125, height: 2436 } as const;

const heroShot: Shot = {
  src: "/nick/Screenshot-desktop-01.png",
  alt: "Nick Whittaker Imagery homepage — 'Unique light.' headline over fine-art ocean and water photography, with a Most Popular print grid below.",
  caption: "Homepage — the collection's opening line.",
  ...DESK,
  frame: "browser",
};

const roomShots: Shot[] = [
  {
    src: "/nick/Screenshot-desktop-03.png",
    alt: "'Smooth Lines' print framed and hung in a moody, dark-toned living room, shown on the product page alongside size and paper options.",
    caption: "Smooth Lines, styled in a moody, dark-toned room.",
    ...DESK,
    frame: "browser",
  },
  {
    src: "/nick/Screenshot-desktop-04.png",
    alt: "'Smooth Lines' print framed and hung in a warm, plant-filled living room, shown on the product page alongside size and paper options.",
    caption: "Smooth Lines, styled in a warm living room.",
    ...DESK,
    frame: "browser",
  },
  {
    src: "/nick/Screenshot-desktop-05.png",
    alt: "Zoomed lightbox view of the 'Smooth Lines' print in the warm living room, labelled 'Warm Living Room'.",
    caption: "A closer look — every room option is one click away.",
    ...DESK,
    frame: "browser",
  },
  {
    src: "/nick/screanshoot-mob-03.PNG",
    alt: "Mobile product page for 'East Coast Curl', shown framed in a warm, textured living room in Whangamata, New Zealand.",
    caption: "East Coast Curl, styled in a warm, textured room.",
    ...MOB,
    frame: "phone",
  },
  {
    src: "/nick/screanshoot-mob-04.PNG",
    alt: "Mobile product page for 'East Coast Curl', shown framed in a light, minimal living room.",
    caption: "East Coast Curl, styled in a light, minimal room.",
    ...MOB,
    frame: "phone",
  },
  {
    src: "/nick/screanshoot-mob-05.PNG",
    alt: "Mobile product page for 'Smooth Lines', shown framed in a warm living room.",
    caption: "Smooth Lines, in a warm living room, on mobile.",
    ...MOB,
    frame: "phone",
  },
  {
    src: "/nick/screanshoot-mob-06.PNG",
    alt: "Mobile product page for 'Smooth Lines', shown framed in a moody, dark-toned room.",
    caption: "Smooth Lines, in a moody, dark room, on mobile.",
    ...MOB,
    frame: "phone",
  },
];

const siteShots: Shot[] = [
  {
    src: "/nick/Screenshot-desktop-02.png",
    alt: "Explore the work gallery page, showing 37 photos across six bodies of work with filter pills for Sunsets, Wave, Abstract, and more.",
    caption: "Explore the work — 37 photos across six bodies of work, filterable by mood.",
    ...DESK,
    frame: "browser",
  },
  {
    src: "/nick/screanshoot-mob-01.PNG",
    alt: "Nick Whittaker Imagery homepage on mobile, showing the 'Unique light.' headline and Most Popular print grid.",
    caption: "The same homepage, tuned for mobile.",
    ...MOB,
    frame: "phone",
  },
  {
    src: "/nick/screanshoot-mob-02.PNG",
    alt: "Trade & Commercial page on mobile, with sections for Interior Designers and Real Estate & Staging.",
    caption: "Trade & Commercial — pricing and process for interior designers and real estate teams.",
    ...MOB,
    frame: "phone",
  },
];

const storeShots: Shot[] = [
  {
    src: "/nick/screanshoot-mob-07.PNG",
    alt: "Mobile product card for 'Sunkissed', priced from $150 NZD, with an add-to-cart button and expandable sizes and pricing.",
    caption: "Sunkissed — from $150 NZD.",
    ...MOB,
    frame: "phone",
  },
  {
    src: "/nick/screanshoot-mob-08.PNG",
    alt: "Mobile product card for 'Scatter', priced from $150 NZD, with an add-to-cart button and expandable sizes and pricing.",
    caption: "Scatter — from $150 NZD.",
    ...MOB,
    frame: "phone",
  },
];

const galleryShots: Shot[] = [heroShot, ...roomShots, ...siteShots, ...storeShots];

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
            "radial-gradient(280px circle at var(--x, 50%) var(--y, 30%), rgba(169,151,253,0.35), transparent 70%)",
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

export function NickWhittakerShowcase() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = (src: string) => setLightboxIndex(galleryShots.findIndex((s) => s.src === src));

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
                Case study · {nick.category} · {nick.location}
              </motion.p>
              <motion.h1 variants={heroItem} className="display-title mt-6">
                {nick.name}
              </motion.h1>
              <motion.p variants={heroItem} className="mt-6 text-xl font-medium text-ink-muted">
                {nick.tagline}
              </motion.p>
              <motion.p variants={heroItem} className="mt-6 max-w-xl text-lg leading-8 text-ink-muted">
                {nick.description}
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
                  href="#in-the-room"
                  className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-background px-6 py-3 text-m font-semibold transition hover:bg-foreground/5"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" />
                  <span>See it in the room</span>
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
              text="Not a print shop — a gallery built for the people who buy art for a room."
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-xl leading-7 text-ink-muted">
              An ocean and water photographer based in Auckland had a striking, consistent body of work, but the
              real buyers weren&apos;t browsing for a poster — they were interior designers and hospitality teams
              sourcing large-scale art for a specific hotel lobby, restaurant, or lounge. They needed a gallery
              that spoke to that buyer, and a way to show exactly how a piece would look in a real space before
              anyone committed.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-black/10 bg-background p-8 sm:p-10">
              <p className="eyebrow">What we were asked for</p>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-ink-muted">
                <li>A brand and gallery that reads as trade-grade, not a generic retail template.</li>
                <li>A way to see each piece styled in real interior and hospitality settings, not on a plain white wall.</li>
                <li>A store that works for both individual buyers and trade/hospitality orders, with NZ pricing done right.</li>
              </ul>
              <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-6">
                <Sparkles className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                <p className="eyebrow">Designed by Enodre, inspired by the artist&apos;s eye</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* What we did */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">What we did</p>
            <ScrollRevealHeading
              text="Brand to checkout, designed and built end to end."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {whatWeDid.map((point, index) => (
              <Reveal key={point} delay={index * 0.08}>
                <div className="flex h-full gap-4 rounded-2xl border border-black/10 p-7">
                  <p className="font-mono text-xs font-semibold text-accent">0{index + 1}</p>
                  <p className="leading-7 text-ink-muted">{point}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Brand */}
      <section id="brand" className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The brand</p>
            <ScrollRevealHeading
              text="A palette pulled from the photography, not a swatch library."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Deep water navy, silver foam, and a single warm copper accent — every color was chosen to match
              what was already there in the photographer&apos;s own work, so the site feels unmistakably theirs.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 rounded-2xl border border-black/10 bg-background p-8 sm:p-10">
              <p className="eyebrow">Logo</p>
              <div className="mt-6 flex items-center justify-center rounded-xl bg-[#f5f2ea] p-10 sm:p-14">
                <Image
                  src="/nick/nick-logo.svg"
                  alt="Nick Whittaker Imagery logo — a serif wordmark with a hand-drawn wave underline, designed by Enodre."
                  width={1981}
                  height={715}
                  className="h-auto w-full max-w-xs"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-6 flex flex-wrap gap-3">
              {palette.map((swatch) => (
                <div key={swatch.hex} className="flex items-center gap-3 rounded-xl border border-black/10 bg-background px-4 py-3">
                  <span
                    className="h-8 w-8 flex-none rounded-full border border-black/10"
                    style={{ backgroundColor: swatch.hex }}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium">{swatch.name}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-6 rounded-2xl border border-black/10 bg-background p-8 sm:p-10">
              <p className="eyebrow">Type pairing</p>
              <p className="mt-4 font-serif text-2xl italic">An editorial serif for headings and prices</p>
              <p className="mt-2 font-sans text-sm text-ink-muted">A clean sans for navigation, labels, and everyday copy</p>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-ink-muted">
                The result reads as considered without feeling stiff — the kind of quiet, gallery-like polish
                that makes people trust they&apos;re buying a real print, not a poster.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* In the room */}
      <section id="in-the-room" className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">In the room</p>
            <ScrollRevealHeading
              text="Every piece shown exactly where it's meant to hang."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Interior designers and hospitality buyers don&apos;t picture art on a white wall — they picture it
              in a specific lobby, lounge, or guest room. Enodre created a large library of custom room-context
              images for Nick, styling his photography into real interior and hospitality settings, so a buyer
              can see the actual scale, tone, and mood before they commit.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 flex gap-5 overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory">
              {roomShots.map((shot, index) => (
                <button
                  key={shot.src}
                  type="button"
                  onClick={() => openLightbox(shot.src)}
                  className={`group flex flex-none snap-start flex-col text-left ${shot.frame === "phone" ? "w-52 sm:w-56" : "w-80 sm:w-96"}`}
                >
                  <FramedImage
                    shot={shot}
                    sizes={shot.frame === "phone" ? "14rem" : "24rem"}
                    wrapperClassName="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
                  />
                  <p className="mt-3 text-sm leading-6 text-ink-muted">
                    <span className="font-mono text-xs font-semibold text-accent">0{index + 1}</span> {shot.caption}
                  </p>
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* The gallery */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The gallery</p>
            <ScrollRevealHeading
              text="A site built to browse, filter, and sell to trade buyers."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Thirty-seven photos across six bodies of work, filterable by mood — plus a dedicated Trade &amp;
              Commercial path for interior designers and real estate teams ordering across a whole project.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
            <Reveal delay={0.1}>
              <button
                type="button"
                onClick={() => openLightbox(siteShots[0].src)}
                className="group block w-full text-left transition hover:-translate-y-1"
              >
                <FramedImage
                  shot={siteShots[0]}
                  sizes="(min-width: 1024px) 55vw, 92vw"
                  imageClassName="h-auto w-full transition group-hover:scale-[1.01]"
                />
              </button>
              <p className="mt-4 text-sm leading-6 text-ink-muted">{siteShots[0].caption}</p>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="grid gap-6">
                {siteShots.slice(1).map((shot) => (
                  <button
                    key={shot.src}
                    type="button"
                    onClick={() => openLightbox(shot.src)}
                    className="group block text-left transition hover:-translate-y-1"
                  >
                    <FramedImage
                      shot={shot}
                      sizes="(min-width: 1024px) 22vw, 60vw"
                      wrapperClassName="mx-auto max-w-[13rem]"
                      imageClassName="h-auto w-full transition group-hover:scale-[1.02]"
                    />
                    <p className="mt-3 text-center text-sm leading-6 text-ink-muted">{shot.caption}</p>
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The store */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">The store</p>
            <ScrollRevealHeading
              text="A checkout buyers — and the business — can trust."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Ordering a piece should feel as easy and trustworthy as any modern online store — for a trade
              buyer sourcing for a project or an individual buying for their own home.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
            {orderSteps.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.06} className="bg-card p-7">
                <p className="font-mono text-xs font-semibold text-accent">{step.number}</p>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{step.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              {storeShots.map((shot) => (
                <button
                  key={shot.src}
                  type="button"
                  onClick={() => openLightbox(shot.src)}
                  className="group flex w-40 flex-none flex-col text-left sm:w-44"
                >
                  <FramedImage
                    shot={shot}
                    sizes="11rem"
                    wrapperClassName="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
                  />
                  <p className="mt-3 text-xs leading-5 text-ink-muted">{shot.caption}</p>
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-8 flex items-start gap-4 rounded-2xl bg-foreground p-8 text-background sm:p-10">
              <ShieldCheck className="h-5 w-5 flex-none text-accent" aria-hidden="true" />
              <p className="leading-7">
                An order is only ever marked &ldquo;paid&rdquo; once payment is independently confirmed — never
                just because a customer landed back on the site. That protects the business from ever shipping
                a print that was never actually paid for.
              </p>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Reveal delay={0.18}>
              <div className="flex gap-4 rounded-xl border border-black/10 p-6">
                <Receipt className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">NZ-accurate pricing</p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Prices are shown tax-inclusive, the way New Zealand shoppers expect — no surprise costs
                    added at checkout.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="flex gap-4 rounded-xl border border-black/10 p-6">
                <Mail className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Automatic confirmation emails</p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Every customer gets an order confirmation automatically — sent from the client&apos;s own
                    mailbox, so it feels personal, not corporate.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Outcome */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="rounded-2xl bg-foreground p-10 text-background sm:p-14">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Outcome</p>
              <p className="display-title mt-4 text-[2.5rem] sm:text-6xl">Brand to checkout, shipped.</p>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">{nick.outcome}</p>
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

      {/* Screens */}
      <section className="border-t border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Screens</p>
            <ScrollRevealHeading
              text="Every surface, at a glance."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              The gallery, the trade path, and every room a piece has been styled in — side by side. Click any
              screen to expand it.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
              {galleryShots.map((shot, index) => (
                <button
                  key={shot.src}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="group block w-full break-inside-avoid text-left"
                >
                  <FramedImage
                    shot={shot}
                    sizes="(min-width: 1024px) 22vw, 45vw"
                    imageClassName="h-auto w-full transition duration-300 group-hover:scale-[1.03]"
                    wrapperClassName="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg"
                  />
                </button>
              ))}
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
              text="Need a store that feels as considered as the product photography?"
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
