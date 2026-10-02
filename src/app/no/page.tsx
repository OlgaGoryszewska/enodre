"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Quote } from "lucide-react";
import { expertiseAreas, industries, products, stackGroups, teamMembers } from "@/lib/content";
import { ChallengeSection } from "@/components/challenge/ChallengeSection";
import { LeadOffersSection } from "@/components/LeadOffersSection";
import { PackagesSection } from "@/components/PackagesSection";
import { TeamSection } from "@/components/TeamSection";
import { BlogSection } from "@/components/BlogSection";
import { StackSection } from "@/components/StackSection";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

const SERVICE_CATEGORIES = Array.from(new Set(expertiseAreas.map((area) => area.category)));
const FEATURED_INDUSTRIES = industries.filter((industry) => industry.caseStudySlugs.length > 0).slice(0, 3);

const CATEGORY_LABELS_NO: Record<string, string> = {
  "Product Development": "Produktutvikling",
  "Modernize & Maintain": "Modernisering og vedlikehold",
};

const PRODUCTS_NO: Record<string, { category: string; location: string; tagline: string }> = {
  fuelflo: {
    category: "Midlertidig kraft og drivstoffoperasjoner",
    location: "Saudi-Arabia",
    tagline: "Bevislaget bak drivstoffoperasjoner.",
  },
  "nick-whittaker-imagery": {
    category: "B2B-fotogalleri",
    location: "New Zealand",
    tagline:
      "Et nettgalleri som viser interiørarkitekter og hotell- og restaurantbransjen nøyaktig hvordan kunsten vil se ut i rommet.",
  },
  "bialy-lotos": {
    category: "Nettside for skjønnhet og kosmetologi",
    location: "Polen",
    tagline: "En innholdsdrevet salongside som gjør en kundes behov om til riktig behandling, pris og bestillingslenke.",
  },
  "ceylons-house": {
    category: "Merkevare og nettside for hotell/restaurant",
    location: "Hikkaduwa, Sri Lanka",
    tagline: "En tropisk luksus merkevareidentitet og nettside for et boutiquehotell og takrestaurant på Sri Lanka.",
  },
};

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

const testimonials = [
  {
    name: "Sylwia",
    role: "Biały Lotos",
    avatar: "/avatars/Sylwia-avatar.png",
    slug: "bialy-lotos",
    quote:
      "Jeg er veldig fornøyd med resultatet, spesielt estetikken og SEO. Siden er responsiv og representativ. Samarbeidet med Enodre var smidig og raskt — jeg anbefaler dem definitivt.",
  },
  {
    name: "Nick",
    role: "Nick Whittaker Imagery",
    avatar: "/avatars/Nick-avatar.png",
    slug: "nick-whittaker-imagery",
    quote: "Alt jeg ba om, ble levert i tide. Siden fungerer flott og estetikken er sterk. Jeg kommer definitivt tilbake.",
  },
  {
    name: "Boony",
    role: "",
    avatar: "/avatars/Boony-avatar.png",
    slug: null,
    quote:
      "Ideen min var ikke en standard nettside — vi trengte 3D-prototyper, håndlagde detaljer og en luksuriøs følelse for velstående kunder. Alt dette ble gjennomtenkt ivaretatt.",
  },
  {
    name: "Robert",
    role: "FuelFlo",
    avatar: "/avatars/Robert-avatar.png",
    slug: "fuelflo",
    quote: "Det finnes ikke noe annet der ute som er like dyktig som det de bygde for oss.",
  },
];

export default function HomeNO() {
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
        <div className="shell relative z-10 pt-26 pb-24 sm:pt-40 sm:pb-32">
          <motion.div className="mx-auto max-w-3xl text-center" variants={heroContainer} initial="hidden" animate="show">
            <motion.h1
              variants={heroItem}
              className="font-funnel-display text-6xl font-normal tracking-tight text-foreground sm:text-7xl"
            >
              Vi fikser hvordan bedriften din fungerer.
            </motion.h1>
            <motion.p variants={heroItem} className="font-poppins mt-3 pb-3 text-center tracking-normal text-base text-black sm:mt-4">
              <span className="font-bold">AI-drevne arbeidsflytsystemer</span> for driftstunge bedrifter.{" "}
              <span className="font-bold">AI-kodeaudit</span> for produkter som har vokst fra koden sin.
            </motion.p>
            <motion.div variants={heroItem} className="relative mx-auto mt-10 w-[50vw]">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[100%] w-[100%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, #16163C 30%, #7272C7 40%, #ffffff 100%)" }}
                aria-hidden="true"
              />
              <Image
                src="/nick/moc3.png"
                alt="Mobilapp-dashbord bygget av Enodre"
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
                  Ta kontakt
                </Link>
              </div>
            </motion.div>
            <motion.div
              variants={heroItem}
              className="font-poppins mt-28 flex items-center justify-center gap-3 text-sm text-ink-muted sm:mt-30"
            >
              <span>Rådgivning</span>
              <span className="text-black/20">|</span>
              <span>B2B</span>
              <span className="text-black/20">|</span>
              <span>In-house</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <StackSection groups={stackGroups} locale="no" />

      <LeadOffersSection locale="no" />

      <PackagesSection locale="no" />

      <section id="services" className="border-y border-black/10 bg-card py-20">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Også tilgjengelig</p>
            <p className="font-funnel-display mt-4 max-w-2xl text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
              Selges som en del av tilbudene over, eller alene.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[24px] bg-black/10 sm:grid-cols-2">
            {SERVICE_CATEGORIES.map((category) => {
              const categoryItems = expertiseAreas.filter((area) => area.category === category);
              return (
                <div key={category} className="min-w-0 bg-background">
                  <p className="px-6 pt-6 text-xs font-semibold uppercase tracking-widest text-[#9EA5C3] sm:px-8 sm:pt-8">
                    {CATEGORY_LABELS_NO[category] ?? category}
                  </p>
                  <div className="mt-3">
                    {categoryItems.map((area, index) => (
                      <Reveal key={area.title} delay={index * 0.03} className="min-w-0">
                        <Link
                          href={`/services/${area.slug}`}
                          className="group flex min-w-0 items-center justify-between gap-6 border-t border-black/5 px-6 py-4 transition hover:bg-foreground/[0.03] sm:px-8"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{area.title}</p>
                            <p className="font-poppins mt-1 truncate text-xs text-ink-muted">{area.description}</p>
                          </div>
                          <ArrowRight
                            className="h-4 w-4 flex-none text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-foreground"
                            aria-hidden="true"
                          />
                        </Link>
                      </Reveal>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="mb-10">
              <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Kundecase</p>
              <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
                Programvare vi har tatt fra idé til produksjon.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-6">
            {products.slice(0, 3).map((product, index) => {
              const no = PRODUCTS_NO[product.slug];
              return (
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
                        {no?.category ?? product.category} · {no?.location ?? product.location}
                      </p>
                      <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#1D1D1F]">{product.name}</h3>
                      <p className="font-poppins mt-2 text-sm font-normal text-ink-muted">{no?.tagline ?? product.tagline}</p>
                      <p className="mt-8 text-sm font-semibold text-[#1D1D1F] group-hover:underline">Se {product.name} →</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/products"
              className="font-poppins inline-flex items-center gap-2 rounded-full border border-black/10 bg-background px-5 py-2.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              <span>Alle kundecase</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="industries" className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">Bransjer</p>
            <ScrollRevealHeading
              text="Bygget for bransjer som drives av operasjonell kompleksitet."
              className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em]"
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_INDUSTRIES.map((industry, index) => (
              <Reveal key={industry.slug} delay={index * 0.06}>
                <Link
                  href={`/industries/${industry.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-black/10 bg-card transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  {industry.image && (
                    <div className="relative h-32 w-full">
                      <Image
                        src={industry.image}
                        alt={`${industry.title} industry`}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-base font-semibold tracking-tight">{industry.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{industry.description}</p>
                    <p className="mt-4 text-sm font-semibold text-foreground group-hover:underline">Se →</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/industries"
              className="font-poppins inline-flex items-center gap-2 rounded-full border border-black/10 bg-background px-5 py-2.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              <span>Alle bransjer</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Kundeuttalelser</p>
            <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
              Hva grunnleggerne og investorene vi har bygget for, sier.
            </p>
          </Reveal>
          <div
            ref={testimonialsRef}
            onScroll={handleTestimonialsScroll}
            className="mt-10 flex gap-6 overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-proximity"
          >
            {testimonials.map((testimonial, index) => {
              const card = (
                <div className="group flex h-full w-72 flex-none flex-col items-center rounded-[28px] bg-background p-8 text-center shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(30,30,60,0.25)] sm:w-80">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
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
                      Se kundecase →
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
                aria-label={`Gå til ${testimonial.name}s uttalelse`}
                aria-current={activeTestimonial === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeTestimonial === index ? "w-6 bg-accent" : "w-2 bg-black/15 hover:bg-black/30"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <TeamSection members={teamMembers} ctaHref="#get-in-touch" locale="no" />

      <ChallengeSection locale="no" />

      <BlogSection locale="no" />
    </>
  );
}
