"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { expertiseAreas, founder, products, stackGroups } from "@/lib/content";
import { ChallengeSection } from "@/components/challenge/ChallengeSection";
import { TeamSection } from "@/components/TeamSection";
import { StackSection } from "@/components/StackSection";
import { Reveal } from "@/components/motion/Reveal";

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

export default function Home() {
  return (
    <>
      <section className="bg-[linear-gradient(to_bottom,var(--background)_0%,#D5D7E2_45%)] py-20 sm:py-28 lg:py-36">
        <div className="shell">
          <motion.div
            className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-16"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <div>
              <motion.p variants={heroItem} className="eyebrow mb-8">
                Digital product studio
              </motion.p>
              <motion.h1 variants={heroItem} className="display-title">
                We build the systems that help ambitious businesses work smarter and grow faster.
              </motion.h1>
              <motion.video
                variants={heroItem}
                src="/video-hero.mp4"
                aria-hidden="true"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="-mx-4 h-auto w-[calc(100%+2rem)] max-w-none pt-20 sm:mx-0 sm:w-full sm:max-w-full"
              />
              <motion.p variants={heroItem} className="mt-10 max-w-2xl text-lg leading-8 text-ink-muted sm:text-xl">
                We untangle complexity through thoughtfully designed digital solutions. From workflow automation and custom software to insightful dashboards and conversion-focused websites, we build technology that helps your business work smarter, move faster, and scale with clarity.
              </motion.p>
              <motion.div variants={heroItem} className="mt-10 flex flex-wrap gap-4">
                <Link className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-m font-semibold text-background transition hover:opacity-90" href="/services">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
                  <span>Explore our services</span>
                </Link>
                <Link className=" bg-background inline-flex items-center gap-2 rounded-full border border-black/20 px-6 py-3 text-m font-semibold transition hover:bg-foreground/5" href="/products">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" />
                  <span>See our work</span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-card py-20">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_2fr]">
          <Reveal>
            <p className="eyebrow">What we do</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              From the first conversation to a product your team actually loves using.
            </h2>
            <p className="mt-6 leading-7 text-ink-muted">
              We design, build, and launch digital solutions that solve real business problems. Whether you need to streamline operations, modernize outdated tools, or create entirely new experiences, we deliver software that&apos;s intuitive, scalable, and built around the way your business works.
            </p>
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow">Our expertise</p>
            </Reveal>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {expertiseAreas.map((area, index) => (
                <Reveal key={area.title} delay={index * 0.08}>
                  <div className="rounded-2xl border border-black/10 bg-card p-7">
                    <h3 className="text-xl font-semibold tracking-tight">{area.title}</h3>
                    <p className="mt-3 leading-7 text-ink-muted">{area.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Products we delivered</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Software we&apos;ve taken from idea to production.</h2>
              </div>
              <Link className="hidden text-sm font-semibold sm:block" href="/products">All products →</Link>
            </div>
          </Reveal>
          <div className="grid gap-6">
            {products.map((product, index) => (
              <Reveal key={product.slug} delay={index * 0.08}>
                <Link
                  href={`/products/${product.slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-black/10 bg-card transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:grid-cols-[0.9fr_1.1fr]"
                >
                  {product.image && (
                    <div className="flex items-center justify-center border-b border-black/10 bg-background p-8 sm:border-b-0 sm:border-r">
                      <Image
                        src={product.image}
                        alt={product.imageAlt ?? ""}
                        width={1080}
                        height={1080}
                        sizes="(min-width: 1024px) 32vw, 90vw"
                        className="h-auto w-full max-w-xs"
                      />
                    </div>
                  )}
                  <div className="flex flex-col p-8 sm:p-10">
                    <p className="eyebrow">{product.category}</p>
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
        </div>
      </section>

      <TeamSection member={founder} ctaHref="#get-in-touch" />

      <StackSection groups={stackGroups} />

      <ChallengeSection />
    </>
  );
}
