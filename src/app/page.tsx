"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, Quote } from "lucide-react";
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

const SERVICE_CATEGORIES = Array.from(new Set(expertiseAreas.map((area) => area.category)));

const EXPERTISE_CARD_STYLES: { title: string; number: string; gradient: string; light?: boolean }[] = [
  { title: "Custom Software Development", number: "01", gradient: "linear-gradient(135deg, #E9F1FF 0%, #FFFFFF 100%)" },
  { title: "MVP Development", number: "02", gradient: "linear-gradient(135deg, #ECEEF5 0%, #FFFFFF 100%)" },
  { title: "Web Development", number: "03", gradient: "linear-gradient(135deg, #EFEFF4 0%, #FFFFFF 100%)" },
  { title: "SaaS Development", number: "04", gradient: "linear-gradient(135deg, #EFEFEF 0%, #F9F9F9 100%)" },
  { title: "Mobile App Development", number: "05", gradient: "linear-gradient(135deg, #F5F1FF 0%, #FFFFFF 100%)" },
  { title: "LMS Development", number: "06", gradient: "linear-gradient(135deg, #EAF4FF 0%, #FFFFFF 100%)", light: true },
  { title: "AI Automation Engineer", number: "07", gradient: "linear-gradient(135deg, #F3EEFF 0%, #FFFFFF 100%)", light: true },
  { title: "UI & UX Design", number: "08", gradient: "linear-gradient(135deg, #FFF0F6 0%, #FFFFFF 100%)", light: true },
  { title: "Legacy Code Refactoring", number: "09", gradient: "linear-gradient(135deg, #F0F0F2 0%, #FFFFFF 100%)" },
  { title: "Software Code Audit", number: "10", gradient: "linear-gradient(135deg, #EAFBF1 0%, #FFFFFF 100%)", light: true },
  { title: "Systems Integration", number: "11", gradient: "linear-gradient(135deg, #DFF5F1 0%, #FFFFFF 100%)" },
  { title: "DevOps", number: "12", gradient: "linear-gradient(135deg, #EAF6FF 0%, #FFFFFF 100%)" },
  { title: "Cloud Migration", number: "13", gradient: "linear-gradient(135deg, #F1F0FF 0%, #FFFFFF 100%)" },
  { title: "Azure Consulting", number: "14", gradient: "linear-gradient(135deg, #E8F0FF 0%, #FFFFFF 100%)", light: true },
];

function ExpertiseCardBody({ area, light }: { area: (typeof expertiseAreas)[number]; light?: boolean }) {
  return (
    <h3 className={`text-[38px] font-semibold leading-tight tracking-tighter ${light ? "text-white" : "text-[#1D1D1F]"}`}>
      {area.title}
    </h3>
  );
}

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
  const categoryRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollCategoryRow = (category: string) => {
    const el = categoryRowRefs.current[category];
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + 370, behavior: "smooth" });
  };

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
       
        <div className="shell relative z-10 pt-26 pb-24 sm:pt-40 sm:pb-32">
          <motion.div className="mx-auto max-w-3xl text-center" variants={heroContainer} initial="hidden" animate="show">
            <motion.h1
              variants={heroItem}
              className="font-funnel-display text-6xl font-normal tracking-tight text-foreground sm:text-7xl"
            >
              Digital Studio
            </motion.h1>
            <motion.p variants={heroItem} className="font-poppins mt-3 pb-3 text-center tracking-normal text-base text-black sm:mt-4">
              Build the right product, from the start. <span className="font-bold">Senior product engineering</span> for founders, backed by 12 years of
              experience
            </motion.p>
            <motion.div variants={heroItem} className="relative mx-auto mt-10 w-[50vw]">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[100%] w-[100%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, #16163C 30%, #7272C7 40%, #ffffff 100%)" }}
                aria-hidden="true"
              />
              <Image
                src="/nick/moc3.png"
                alt=""
                width={1277}
                height={1231}
                className="relative h-auto w-full mb-6"
              />
            </motion.div>
            <motion.div variants={heroItem} className="mt-10 flex justify-center">
              <div className="rounded-full bg-[linear-gradient(90deg,#FB52ED_0%,#C7B2FD_23%,#4D5CFF_70%,#29FF6F_90%,#5CFF91_100%)] p-[2px] shadow-[0_4px_4px_rgba(0,0,0,0.15)] [background-size:200%_100%] [background-position:0%_50%] transition-[background-position] duration-500 hover:[background-position:100%_50%] active:[background-position:100%_50%]">
                <Link
                  href="#get-in-touch"
                  className="font-poppins flex items-center justify-center rounded-full bg-background px-10 py-3 text-base font-medium text-foreground sm:px-20"
                >
                  Get in touch
                </Link>
              </div>
            </motion.div>
            <motion.div
              variants={heroItem}
              className="font-poppins mt-28 flex items-center justify-center gap-3 text-sm text-ink-muted sm:mt-30"
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

      <section id="services" className="border-y border-black/10 bg-card py-20">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_2fr]">
          <Reveal>
            <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Services we offer</p>
            <ScrollRevealHeading
              text="Full-cycle development teams ready to turn your vision into a working, scalable product."
              className="font-poppins mt-4 text-sm font-normal"
            />
          </Reveal>
          <div className="min-w-0">
            {SERVICE_CATEGORIES.map((category, categoryIndex) => (
              <div key={category} className={`min-w-0${categoryIndex > 0 ? " mt-8" : ""}`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9EA5C3]">{category}</p>
                <div className="relative mt-3">
                  <div
                    ref={(el) => {
                      categoryRowRefs.current[category] = el;
                    }}
                    className="flex gap-[30px] overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory"
                  >
                    {expertiseAreas
                    .filter((area) => area.category === category)
                    .map((area, index) => {
                      const cardStyle = EXPERTISE_CARD_STYLES.find((card) => card.title === area.title)!;
                      return (
                        <Reveal key={area.title} delay={index * 0.05} className="flex-none snap-center">
                          <div
                            className="relative h-[460px] w-[340px] cursor-pointer overflow-hidden rounded-[28px] p-7 shadow-[0_24px_48px_-20px_rgba(30,30,60,0.35)] transition-all duration-200 ease-out hover:scale-[0.97] hover:shadow-[0_10px_24px_-14px_rgba(30,30,60,0.35)]"
                            style={{ background: cardStyle.gradient }}
                          >
                            {area.title === "Systems Integration" && (
                              <Image
                                src="/system-integration-image.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                            {area.title === "DevOps" && (
                              <Image
                                src="/DevOPs-img.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                            {area.title === "Cloud Migration" && (
                              <Image
                                src="/cloude-migration-img.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                            {area.title === "Azure Consulting" && (
                              <>
                                <Image
                                  src="/azure-img.png"
                                  alt=""
                                  fill
                                  sizes="340px"
                                  className="pointer-events-none object-cover"
                                />
                                <div
                                  className="pointer-events-none absolute inset-0"
                                  style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0) 55%)" }}
                                />
                              </>
                            )}
                            {area.title === "Software Code Audit" && (
                              <>
                                <Image
                                  src="/audit-img.png"
                                  alt=""
                                  fill
                                  sizes="340px"
                                  className="pointer-events-none object-cover"
                                />
                                <div
                                  className="pointer-events-none absolute inset-0"
                                  style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0) 55%)" }}
                                />
                              </>
                            )}
                            {area.title === "Legacy Code Refactoring" && (
                              <Image
                                src="/code-refactory-image.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                            {area.title === "LMS Development" && (
                              <>
                                <Image
                                  src="/LMS.png"
                                  alt=""
                                  fill
                                  sizes="340px"
                                  className="pointer-events-none object-cover"
                                />
                                <div
                                  className="pointer-events-none absolute inset-0"
                                  style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0) 55%)" }}
                                />
                              </>
                            )}
                            {area.title === "AI Automation Engineer" && (
                              <>
                                <Image
                                  src="/ai-image.png"
                                  alt=""
                                  fill
                                  sizes="340px"
                                  className="pointer-events-none object-cover"
                                />
                                <div
                                  className="pointer-events-none absolute inset-0"
                                  style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0) 55%)" }}
                                />
                              </>
                            )}
                            {area.title === "UI & UX Design" && (
                              <>
                                <Image
                                  src="/ux-design.png"
                                  alt=""
                                  fill
                                  sizes="340px"
                                  className="pointer-events-none object-cover"
                                />
                                <div
                                  className="pointer-events-none absolute inset-0"
                                  style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0) 55%)" }}
                                />
                              </>
                            )}
                            <div className="relative z-10">
                              <ExpertiseCardBody area={area} light={cardStyle.light} />
                            </div>
                            {area.title === "Custom Software Development" && (
                              <Image
                                src="/custome-software-img.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                            {area.title === "Web Development" && (
                              <Image
                                src="/web-devel-img.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                            {area.title === "MVP Development" && (
                              <Image
                                src="/mvp-image.png"
                                alt=""
                                width={1370}
                                height={1148}
                                className="pointer-events-none absolute -bottom-10 -right-16 w-[380px]"
                              />
                            )}
                            {area.title === "Mobile App Development" && (
                              <Image
                                src="/mobile-app-image.png"
                                alt=""
                                width={800}
                                height={776}
                                className="pointer-events-none absolute -bottom-10 -right-16 w-[340px]"
                              />
                            )}
                            {area.title === "SaaS Development" && (
                              <Image
                                src="/sas-image.png"
                                alt=""
                                width={1536}
                                height={1024}
                                className="pointer-events-none absolute -bottom-16 -right-10 w-[420px] rounded-xl"
                              />
                            )}
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => scrollCategoryRow(category)}
                    aria-label={`Scroll ${category} cards`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-background text-foreground transition hover:bg-foreground/5"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProcessSection />

      <section id="industries" className="py-20 sm:py-28">
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
              <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Case studies</p>
              <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
                Software we&apos;ve taken from idea to production.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-6">
            {products.slice(0, 3).map((product, index) => (
              <Reveal key={product.slug} delay={index * 0.08}>
                <Link
                  href={`/products/${product.slug}`}
                  className="group grid overflow-hidden rounded-[28px] border border-black/5 bg-card shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(30,30,60,0.25)] sm:grid-cols-[0.9fr_1.1fr]"
                >
                  {product.image && (
                    <ParallaxImage className="aspect-[4/3] bg-background sm:aspect-auto sm:h-full">
                      <Image
                        src={product.image}
                        alt={product.imageAlt ?? ""}
                        fill
                        sizes="(min-width: 1024px) 32vw, 90vw"
                        className="object-cover"
                      />
                    </ParallaxImage>
                  )}
                  <div className="flex flex-col justify-center p-8 sm:p-10">
                    <p className="eyebrow">
                      {product.category} · {product.location}
                    </p>
                    <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#1D1D1F]">{product.name}</h3>
                    <p className="font-poppins mt-2 text-sm font-normal text-ink-muted">{product.tagline}</p>
                    <p className="mt-8 text-sm font-semibold text-[#1D1D1F] group-hover:underline">Explore {product.name} →</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/products"
              className="font-poppins inline-flex items-center gap-2 rounded-full border border-black/10 bg-background px-5 py-2.5 text-sm font-medium transition hover:bg-foreground/5"
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
            <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Testimonials</p>
            <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
              What the founders and investors we&apos;ve built for have to say.
            </p>
          </Reveal>
          <div
            ref={testimonialsRef}
            onScroll={handleTestimonialsScroll}
            className="mt-10 flex gap-6 overflow-x-auto px-[calc(50%-144px)] pb-4 [scrollbar-width:thin] snap-x snap-mandatory sm:px-[calc(50%-160px)]"
          >
            {testimonials.map((testimonial, index) => {
              const card = (
                <div className="group flex h-full w-72 flex-col items-center text-center sm:w-80">
                  <Image
                    src={testimonial.avatar}
                    alt=""
                    width={448}
                    height={448}
                    sizes="224px"
                    className="h-56 w-56 flex-none rounded-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                  />
                  <p className="mt-6 text-base font-semibold text-[#1D1D1F]">{testimonial.name}</p>
                  {testimonial.role && <p className="font-poppins text-xs text-ink-muted">{testimonial.role}</p>}
                  <div className="mt-5 flex flex-1 flex-col items-center">
                    <Quote className="h-5 w-5 flex-none text-accent/40" aria-hidden="true" />
                    <p className="font-poppins mt-3 text-sm leading-6 text-ink-muted">
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
