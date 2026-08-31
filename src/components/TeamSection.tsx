"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Founder } from "@/lib/content";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

interface TeamSectionProps {
  member: Founder;
  ctaHref: string;
}

export function TeamSection({ member, ctaHref }: TeamSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [intro, ...rest] = member.bio;

  return (
    <section className="border-y border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto aspect-square w-full max-w-xs lg:mx-0"
          >
            <motion.div
              aria-hidden="true"
              animate={{ scaleX: [1, 0.82, 1], opacity: [0.28, 0.14, 0.28] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-2 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-full bg-foreground/25 blur-xl"
            />
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-full w-full rounded-full bg-[linear-gradient(135deg,var(--accent),rgba(169,151,253,0.15))] p-[3px] shadow-[0_20px_45px_-25px_rgba(23,33,27,0.35)]"
            >
              <div className="h-full w-full overflow-hidden rounded-full bg-card">
                <Image
                  src={member.image}
                  alt={member.imageAlt}
                  width={237}
                  height={357}
                  sizes="(min-width: 1024px) 320px, 60vw"
                  className="h-full w-full scale-[1.25] object-cover object-[center_20%]"
                />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            
            <ScrollRevealHeading
              text={`Meet ${member.name}`}
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            />
            <p className="mt-2 text-sm font-semibold text-accent">{member.role}</p>

            <div className="mt-8 grid gap-5">
              <p className="leading-7 text-ink-muted">{intro}</p>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="bio-rest"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="grid gap-5 overflow-hidden"
                  >
                    {rest.map((paragraph) => (
                      <p key={paragraph} className="leading-7 text-ink-muted">
                        {paragraph}
                      </p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:opacity-80"
            >
              <span>{expanded ? "Read less" : "Read more"}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            <div className="mt-10">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
                href={ctaHref}
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
                <span>Send us a message</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
