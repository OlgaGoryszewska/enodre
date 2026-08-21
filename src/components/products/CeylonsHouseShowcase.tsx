"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowUpRight,
  Compass,
  GitBranch,
  ImageIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import { products } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

const ceylon = products.find((product) => product.slug === "ceylons-house")!;

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const challenge = [
  "Luxurious but approachable",
  "Tropical and immersive",
  "Authentic to Sri Lanka",
  "Memorable for international travelers",
  "Elevated for a boutique hospitality experience",
];

const moodMarks = ["Palms & peacock motifs", "Organic elegance", "Warm, earthy tones", "Handcrafted, not generic"];

const styleIngredients = [
  { label: "Color", desc: "Rich tropical hues with soft earthy neutrals, not a cold corporate palette." },
  { label: "Type", desc: "Elegant serif headlines paired with clean, modern sans-serif for everyday copy." },
  { label: "Iconography", desc: "Playful but premium — palm and peacock motifs carried across the identity." },
  { label: "Photography", desc: "Immersive imagery of rooms, views, dining, and nature, shot large." },
];

const designThinking = [
  {
    icon: Sparkles,
    title: "Logo & identity",
    body: "The mark needed to be immediately recognizable and emotionally resonant — leaning into tropical symbolism (palms, peacocks) while staying clean enough to hold up as a premium hospitality brand.",
  },
  {
    icon: Palette,
    title: "Website atmosphere",
    body: "The site carries the same emotional tone as the brand: large landscape imagery, warm color blocks, and elegant typography, structured to feel calm and inviting rather than like a generic hotel template.",
  },
  {
    icon: Compass,
    title: "User experience",
    body: "Built around how travelers actually browse — a quick sense of place, proof of quality, and a clear, natural path from first impression through to booking or a direct inquiry.",
  },
];

const keyScreens = [
  { title: "Home", caption: "Introduces the hotel and its emotional atmosphere." },
  { title: "Rooms & amenities", caption: "Communicates comfort and boutique-level luxury." },
  { title: "Restaurant", caption: "Highlights fresh seafood, rooftop dining, and local flavors." },
  { title: "Wellness & activities", caption: "Massages, Ayurveda, and surfing, close to the property." },
  { title: "Contact & booking", caption: "Turns interest into an inquiry or a reservation." },
];

const projectFiles = [
  { file: "index.html", desc: "primary brand experience" },
  { file: "menu.html", desc: "restaurant storytelling" },
  { file: "contact.html", desc: "booking & inquiry flow" },
  { file: "css/styless.css", desc: "full visual design system" },
  { file: "carusele.js", desc: "image carousel & motion" },
];

const deploymentLinks = [
  { label: "GitHub repository", href: "https://github.com/OlgaGoryszewska/Ceylons-house-hikkaduwa", icon: GitBranch },
  { label: "Live site", href: "http://ceylonshouse.com/", icon: ArrowUpRight },
];

const outcomeChips = ["Tropical luxury identity", "Brand to launch", "Deployed on Netlify", "Boutique hospitality"];

export function CeylonsHouseShowcase() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(181,152,63,0.28),transparent_60%)] py-20 sm:py-28">
        <div className="shell">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/products" className="text-sm font-semibold text-ink-muted hover:text-foreground">
              ← All case studies
            </Link>
            {ceylon.url && (
              <a
                href={ceylon.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-foreground"
              >
                <span>Visit ceylonshouse.com</span>
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
                Case study · {ceylon.category} · {ceylon.location}
              </motion.p>
              <motion.h1 variants={heroItem} className="display-title mt-6">
                {ceylon.name}
              </motion.h1>
              <motion.p variants={heroItem} className="mt-6 text-xl font-medium text-ink-muted">
                {ceylon.tagline}
              </motion.p>
              <motion.p variants={heroItem} className="mt-6 max-w-xl text-lg leading-8 text-ink-muted">
                {ceylon.description}
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
              <div className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-black/20 bg-card text-sm text-ink-muted">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-6 w-6" aria-hidden="true" />
                  <p className="mt-3">Logo landing soon</p>
                </div>
              </div>
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
              text="Turn a place with strong emotional appeal into a visual system."
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-xl leading-7 text-ink-muted">
              A place where guests wake up to jungle views, eat seafood dinners under the stars, relax by the
              pool, and are still a short walk from the beach. The identity and site needed to communicate that
              atmosphere clearly and consistently, not just describe it.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-black/10 bg-background p-8 sm:p-10">
              <p className="eyebrow">The brand had to feel</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {challenge.map((item) => (
                  <span key={item} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-6">
                <Sparkles className="h-4 w-4 flex-none text-accent" aria-hidden="true" />
                <p className="eyebrow">Designed and built by Enodre</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Identity */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Brand direction</p>
            <ScrollRevealHeading
              text="A tropical luxury identity, built from the setting itself."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              The visual identity is built around the hotel&apos;s own setting — palms, peacocks, jungle
              textures, and warm light — so the brand reads as handcrafted and elevated rather than a generic
              hospitality template.
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mt-10 rounded-2xl border border-dashed border-black/20 bg-card p-8 sm:p-10">
              <p className="eyebrow">Logo</p>
              <div className="mt-6 flex aspect-[2/1] items-center justify-center rounded-xl border border-dashed border-black/20 text-sm text-ink-muted">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-6 w-6" aria-hidden="true" />
                  <p className="mt-3">Logo and brand assets landing soon</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-6 flex flex-wrap gap-2">
              {moodMarks.map((item) => (
                <span key={item} className="rounded-full border border-black/10 bg-card px-4 py-2 text-sm font-medium text-ink-muted">
                  {item}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {styleIngredients.map((ingredient) => (
                <div key={ingredient.label} className="rounded-2xl border border-black/10 bg-card p-6">
                  <p className="eyebrow">{ingredient.label}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">{ingredient.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Design thinking */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Design thinking</p>
            <ScrollRevealHeading
              text="Not just a logo — a system that had to live everywhere."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              The identity had to carry across the website, the menu, marketing materials, and social presence —
              not just look good as a standalone mark.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {designThinking.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 0.08}>
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

      {/* Screens */}
      <section id="screens" className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Key screens & brand moments</p>
            <ScrollRevealHeading
              text="A structure built around the full guest journey."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              Each section reinforces the same identity — tropical retreat, thoughtful hospitality, and authentic
              experiences. Screenshots landing here soon.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {keyScreens.map((screen) => (
                <div key={screen.title} className="rounded-2xl border border-dashed border-black/20 p-6">
                  <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-card text-sm text-ink-muted">
                    <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                    Coming soon
                  </div>
                  <p className="mt-4 text-sm font-semibold">{screen.title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">{screen.caption}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Technical execution */}
      <section className="border-b border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Technical execution</p>
            <ScrollRevealHeading
              text="A lightweight static build, not a template."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              The front end is a static HTML, CSS, and JavaScript site with a clear separation between layout,
              styling, and interactive elements — fast, simple, and reliable, while still delivering a polished
              visual presence.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 rounded-2xl bg-foreground p-8 font-mono text-xs leading-6 text-background sm:p-10">
              <p className="text-background/50">project structure</p>
              {projectFiles.map((item) => (
                <p key={item.file} className="mt-2">
                  {item.file} <span className="text-background/50">— {item.desc}</span>
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Deployment & launch */}
      <section className="border-b border-black/10 py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Deployment &amp; launch</p>
            <ScrollRevealHeading
              text="From concept to a live, bookable site."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              The brand and website were taken from concept to a fully usable digital format, deployed on
              Netlify — the full lifecycle of identity design, website execution, and a real public launch.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-4">
              {deploymentLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-card px-6 py-3 text-sm font-semibold transition hover:bg-foreground/5"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-8 flex flex-wrap gap-2">
              {ceylon.stack.map((item) => (
                <span key={item} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted">
                  {item}
                </span>
              ))}
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
              <p className="display-title mt-4 text-[2.5rem] sm:text-6xl">A brand experience, not just a website.</p>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">{ceylon.outcome}</p>
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
              text="Need a brand and a site that feel like one coherent story?"
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
    </>
  );
}
