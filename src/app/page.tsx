"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Globe, Layers, LayoutDashboard, MapPin, Quote, Smartphone, Sparkles } from "lucide-react";
import { expertiseAreas, founder, products, stackGroups } from "@/lib/content";
import { ChallengeSection } from "@/components/challenge/ChallengeSection";
import { TeamSection } from "@/components/TeamSection";
import { StackSection } from "@/components/StackSection";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

const heroContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const EXPERTISE_ICONS: Record<string, typeof LayoutDashboard> = {
  "Custom Dashboards": LayoutDashboard,
  "Web Applications & Websites": Globe,
  "AI Integrations & Automation": Sparkles,
  "Native Mobile Apps": Smartphone,
  "CMS & Content Platforms": Layers,
};

const testimonials = [
  {
    name: "Sylwia",
    role: "Biały Lotos",
    avatar: "/avatars/Sylwia-avatar.png",
    slug: "bialy-lotos",
    quote: "Perfectly planned, luxurious looking web page.",
  },
  {
    name: "Nick",
    role: "Nick Whittaker Imagery",
    avatar: "/avatars/Nick-avatar.png",
    slug: "nick-whittaker-imagery",
    quote: "Is another level of an online gallery.",
  },
  {
    name: "Boony",
    role: "",
    avatar: "/avatars/Boony-avatar.png",
    slug: null,
    quote: "Creative approach and storytelling in one webpage.",
  },
  {
    name: "Robert",
    role: "FuelFlo",
    avatar: "/avatars/Robert-avatar.png",
    slug: "fuelflo",
    quote: "Is nothing as capable as we have developed.",
  },
];

export default function Home() {
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const handleTestimonialsScroll = () => {
    const el = testimonialsRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const ratio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    setActiveTestimonial(Math.round(ratio * (testimonials.length - 1)));
  };

  const scrollToTestimonial = (index: number) => {
    const el = testimonialsRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
  };

  return (
    <>
      <section className="relative flex items-start overflow-hidden">
        <div
          className="absolute inset-0 bg-[url('/noise-enodre.png')] bg-cover bg-top bg-fixed"
          aria-hidden="true"
        />
        <div className="shell relative z-10 pt-32 pb-24 sm:pt-40 sm:pb-32">
          <motion.div className="mx-auto max-w-3xl text-center" variants={heroContainer} initial="hidden" animate="show">
            <motion.h1
              variants={heroItem}
              className="font-funnel-display text-6xl font-normal tracking-tight text-foreground sm:text-7xl"
            >
              Digital Studio
            </motion.h1>
            <motion.p variants={heroItem} className="font-poppins mt-8 text-2xl font-medium text-foreground sm:text-3xl">
              Build the right product. From the start.
            </motion.p>
            <motion.p variants={heroItem} className="font-poppins mt-3 text-base text-ink-muted">
              Senior product engineering for founders, backed by 12 years of experience
            </motion.p>
            <motion.div variants={heroItem} className="mt-10 flex justify-center">
              <div className="rounded-full bg-[linear-gradient(90deg,#FB52ED_0%,#C7B2FD_23%,#4D5CFF_70%,#29FF6F_90%,#5CFF91_100%)] p-[2px] shadow-[0_4px_4px_rgba(0,0,0,0.15)]">
                <Link
                  href="#get-in-touch"
                  className="font-poppins flex items-center justify-center rounded-full bg-background px-20 py-3 text-base font-medium text-foreground transition hover:bg-foreground/5"
                >
                  Get in touch
                </Link>
              </div>
            </motion.div>
            <motion.div
              variants={heroItem}
              className="font-poppins mt-32 flex items-center justify-center gap-3 text-sm text-ink-muted sm:mt-40"
            >
              <span>Consulting</span>
              <span className="text-black/20">|</span>
              <span>B2B</span>
              <span className="text-black/20">|</span>
              <span>In the House</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-card py-20">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_2fr]">
          <Reveal>
            <p className="eyebrow">What we do</p>
            <ScrollRevealHeading
              text="From the first conversation to a product your team actually loves using."
              className="mt-4 text-3xl font-semibold tracking-[-0.04em]"
            />
            <p className="mt-6 leading-7 text-ink-muted">
              We design, build, and launch digital solutions that solve real business problems. Whether you need to streamline operations, modernize outdated tools, or create entirely new experiences, we deliver software that&apos;s intuitive, scalable, and built around the way your business works.
            </p>
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow">Our expertise</p>
            </Reveal>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {expertiseAreas.map((area, index) => {
                const Icon = EXPERTISE_ICONS[area.title];
                return (
                  <Reveal key={area.title} delay={index * 0.08}>
                    <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-card p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
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
                      <h3 className="relative mt-6 text-xl font-semibold tracking-tight">{area.title}</h3>
                      <p className="relative mt-3 leading-7 text-ink-muted">{area.description}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="mb-10">
              <p className="eyebrow">Case studies</p>
              <ScrollRevealHeading
                text="Software we've taken from idea to production."
                className="mt-4 text-4xl font-semibold tracking-[-0.05em]"
              />
            </div>
          </Reveal>
          <div className="grid gap-6">
            {products.slice(0, 3).map((product, index) => (
              <Reveal key={product.slug} delay={index * 0.08}>
                <Link
                  href={`/products/${product.slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-black/10 bg-card transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:grid-cols-[0.9fr_1.1fr]"
                >
                  {product.image && (
                    <ParallaxImage className="aspect-[4/3] border-b border-black/10 bg-background sm:aspect-auto sm:h-full sm:border-b-0 sm:border-r">
                      <Image
                        src={product.image}
                        alt={product.imageAlt ?? ""}
                        fill
                        sizes="(min-width: 1024px) 32vw, 90vw"
                        className="object-cover"
                      />
                    </ParallaxImage>
                  )}
                  <div className="flex flex-col p-8 sm:p-10">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="eyebrow">{product.category}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {product.location}
                      </span>
                    </div>
                    <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{product.name}</h3>
                    <p className="mt-2 text-lg font-medium text-ink-muted">{product.tagline}</p>
                    <p className="mt-4 leading-7 text-ink-muted">{product.description}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {product.stack.map((item) => (
                        <span key={item} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-ink-muted">
                          {item}
                        </span>
                      ))}
                    </div>
                    <p className="mt-8 font-mono text-sm text-accent">{product.outcome}</p>
                    <p className="mt-auto pt-8 text-sm font-semibold group-hover:underline">Explore {product.name} →</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-foreground/5"
            >
              <span>All case studies</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Testimonials</p>
            <ScrollRevealHeading
              text="Customers who trust us to get it right."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-6 max-w-2xl leading-7 text-ink-muted">
              What the founders and investors we&apos;ve built for have to say.
            </p>
          </Reveal>
          <div
            ref={testimonialsRef}
            onScroll={handleTestimonialsScroll}
            className="mt-10 flex gap-6 overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory"
          >
            {testimonials.map((testimonial, index) => {
              const card = (
                <div
                  className={`group flex h-full w-72 flex-col items-center rounded-2xl border border-black/10 bg-background p-8 text-center shadow-sm transition duration-300 sm:w-80 ${
                    testimonial.slug ? "hover:-translate-y-1 hover:shadow-xl" : ""
                  }`}
                >
                  <Image
                    src={testimonial.avatar}
                    alt=""
                    width={224}
                    height={224}
                    sizes="112px"
                    className="h-28 w-28 flex-none rounded-full object-cover"
                  />
                  <p className="mt-5 text-base font-semibold">{testimonial.name}</p>
                  {testimonial.role && <p className="text-xs text-ink-muted">{testimonial.role}</p>}
                  <div className="mt-5 flex flex-1 flex-col items-center border-t border-black/10 pt-5">
                    <Quote className="h-5 w-5 flex-none text-accent/40" aria-hidden="true" />
                    <p className="mt-3 text-sm italic leading-6 text-ink-muted">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                  </div>
                  {testimonial.slug && (
                    <p className="mt-5 text-xs font-semibold text-accent opacity-0 transition group-hover:opacity-100">
                      View case study →
                    </p>
                  )}
                </div>
              );
              return (
                <Reveal key={testimonial.name} delay={index * 0.08} className="flex-none snap-center">
                  {testimonial.slug ? <Link href={`/products/${testimonial.slug}`}>{card}</Link> : card}
                </Reveal>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            {testimonials.map((testimonial, index) => (
              <button
                key={testimonial.name}
                type="button"
                onClick={() => scrollToTestimonial(index)}
                aria-label={`Go to ${testimonial.name}'s testimonial`}
                aria-current={activeTestimonial === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeTestimonial === index ? "w-6 bg-accent" : "w-2 bg-black/15 hover:bg-black/30"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <TeamSection member={founder} ctaHref="#get-in-touch" />

      <StackSection groups={stackGroups} />

      <ChallengeSection />
    </>
  );
}
