"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { MapPin, Plus, Quote } from "lucide-react";
import { expertiseAreas, founder, industries, products, stackGroups } from "@/lib/content";
import { cn } from "@/lib/utils";
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

const EXPERTISE_ICON_IMAGES: Record<string, string> = {
  "Custom Software Development": "/custome-soft-dev-icon.png",
  "MVP Development": "/mvp-dev-icon.png",
  "Web Development": "/web-dev-icon.png",
  DevOps: "/dev-icon.png",
  "Mobile App Development": "/mobile-app-dev-icon.png",
  "Software Code Audit": "/code-audit-icon.png",
  "Legacy Code Refactoring": "/legacy-code-icon.png",
  "Cloud Migration": "/cloud-migration-icon.png",
  "Systems Integration": "/system-intergration-icon.png",
  "SaaS Development Company": "/sas-development-icon.png",
  "LMS Development": "/LMS-development.png",
  "UI & UX Design": "/UI-Ux-design-icon.png",
  "Azure Consulting": "/azure-consulting-icon.png",
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
  const [openService, setOpenService] = useState<number | null>(null);

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
       
        <div className="shell relative z-10 pt-32 pb-24 sm:pt-40 sm:pb-32">
          <motion.div className="mx-auto max-w-3xl text-center" variants={heroContainer} initial="hidden" animate="show">
            <motion.h1
              variants={heroItem}
              className="font-funnel-display text-6xl font-normal tracking-tight text-foreground sm:text-7xl"
            >
              Digital Studio
            </motion.h1>
            <motion.p variants={heroItem} className="font-poppins mt-8 text-2xl font-normal text-foreground sm:text-3xl">
              Build the right product. From the start.
            </motion.p>
            <motion.p variants={heroItem} className="font-poppins mt-3 text-base text-ink-muted">
              Senior product engineering for founders, backed by 12 years of experience
            </motion.p>
            <motion.div variants={heroItem} className="mt-10 flex justify-center">
              <div className="rounded-full bg-[linear-gradient(90deg,#FB52ED_0%,#C7B2FD_23%,#4D5CFF_70%,#29FF6F_90%,#5CFF91_100%)] p-[2px] shadow-[0_4px_4px_rgba(0,0,0,0.15)] [background-size:200%_100%] [background-position:0%_50%] transition-[background-position] duration-500 hover:[background-position:100%_50%] active:[background-position:100%_50%]">
                <Link
                  href="#get-in-touch"
                  className="font-poppins flex items-center justify-center rounded-full bg-background px-20 py-3 text-base font-medium text-foreground"
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {expertiseAreas.map((area, index) => {
                const isOpen = openService === index;
                return (
                  <Reveal key={area.title} delay={index * 0.05}>
                    <button
                      type="button"
                      onClick={() => setOpenService(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className={cn(
                        "w-full rounded-2xl border bg-card p-6 text-left transition",
                        isOpen ? "border-accent" : "border-black/10 hover:border-black/25"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {EXPERTISE_ICON_IMAGES[area.title] && (
                            <Image
                              src={EXPERTISE_ICON_IMAGES[area.title]}
                              alt=""
                              width={96}
                              height={96}
                              className="h-16 w-16 shrink-0 object-contain"
                            />
                          )}
                          <h3 className="text-lg font-semibold tracking-tight text-foreground">{area.title}</h3>
                        </div>
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition duration-200",
                            isOpen ? "rotate-45 border-accent text-accent" : "border-black/15 text-ink-muted"
                          )}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.p
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden text-sm leading-6 text-ink-muted"
                          >
                            {area.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </button>
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
            <p className="eyebrow">Industries</p>
            <ScrollRevealHeading
              text="Built for the industries that run on operational complexity."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em]"
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((industry, index) => (
              <Reveal key={industry.title} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-black/10 bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <h3 className="text-base font-semibold tracking-tight">{industry.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{industry.description}</p>
                </div>
              </Reveal>
            ))}
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
