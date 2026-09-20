"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionTemplate, useScroll, useTransform, type Variants } from "framer-motion";
import { MapPin, Quote } from "lucide-react";
import { expertiseAreas, founder, industries, products, stackGroups } from "@/lib/content";
import { ChallengeSection } from "@/components/challenge/ChallengeSection";
import { ProcessSection } from "@/components/ProcessSection";
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
  "AI Automation Engineer": "/A-automation-icon.png",
};

const SERVICE_CATEGORIES = Array.from(new Set(expertiseAreas.map((area) => area.category)));

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

  // Rainbow grid at the bottom of the hero: stable on hover — the only
  // motion is tied to scroll. Colors flow sideways (through white, so the
  // dots visibly flash white as they cycle) while the whole dot pattern
  // drifts along a wavy path, so dots shift up/down and left/right together.
  const { scrollY } = useScroll();
  const rainbowPositionX = useTransform(scrollY, [0, 1000], ["0%", "300%"]);
  const rainbowWaveX = useTransform(scrollY, (value) => `${Math.sin(value / 140) * 6}px`);
  const rainbowWaveY = useTransform(scrollY, (value) => `${Math.cos(value / 100) * 6}px`);
  const rainbowMaskPosition = useMotionTemplate`${rainbowWaveX} ${rainbowWaveY}`;

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
            <motion.p variants={heroItem} className="font-poppins mt-8 tracking-normal text-base text-[#8D8AA9]">
              
            </motion.p>
            <motion.p variants={heroItem} className="font-poppins mt-8 tracking-normal text-base text-[#8D8AA9]">
              <span className="font-bold">Senior product engineering</span> for founders, backed by 12 years of
              experience
            </motion.p>
            <motion.div variants={heroItem} className="relative mx-auto mt-10 w-[50vw]">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, #16163C 100%, #7272C7 29%, #ffff 100%)" }}
                aria-hidden="true"
              />
              <Image
                src="/nick/moc3.png"
                alt=""
                width={1277}
                height={1231}
                className="relative h-auto w-full"
              />
            </motion.div>
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
        <motion.div
          style={{ backgroundPositionX: rainbowPositionX, maskPosition: rainbowMaskPosition, WebkitMaskPosition: rainbowMaskPosition }}
          className="hero-rainbow-grid absolute inset-x-0 bottom-0 h-16 sm:h-24"
          aria-hidden="true"
        />
      </section>

      <section className="border-y border-black/10 bg-card py-20">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_2fr]">
          <Reveal>
            <p className="eyebrow">We Offer Services</p>
            <ScrollRevealHeading
              text="Full-cycle development teams ready to turn your vision into a working, scalable product."
              className="mt-4 text-3xl font-semibold tracking-[-0.04em]"
            />
          </Reveal>
          <div>
            {SERVICE_CATEGORIES.map((category, categoryIndex) => (
              <div key={category} className={categoryIndex > 0 ? "mt-8" : undefined}>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{category}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {expertiseAreas
                    .filter((area) => area.category === category)
                    .map((area, index) => (
                      <Reveal key={area.title} delay={index * 0.05}>
                        <div className="rounded-xl border border-black/10 bg-card p-3 transition hover:border-black/25">
                          <div className="flex items-center gap-2">
                            {EXPERTISE_ICON_IMAGES[area.title] && (
                              <Image
                                src={EXPERTISE_ICON_IMAGES[area.title]}
                                alt=""
                                width={56}
                                height={56}
                                className="h-12 w-12 shrink-0 object-contain"
                              />
                            )}
                            <h3 className="text-sm font-semibold tracking-tight text-foreground">{area.title}</h3>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-ink-muted">{area.description}</p>
                        </div>
                      </Reveal>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProcessSection />

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
                <div className="h-full overflow-hidden rounded-2xl border border-black/10 bg-card transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  {industry.image && (
                    <div className="relative h-32 w-full">
                      <Image src={industry.image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-base font-semibold tracking-tight">{industry.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{industry.description}</p>
                  </div>
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
