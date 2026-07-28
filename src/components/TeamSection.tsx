"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Founder } from "@/lib/content";

interface TeamSectionProps {
  member: Founder;
  ctaHref: string;
}

export function TeamSection({ member, ctaHref }: TeamSectionProps) {
  return (
    <section className="border-y border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-black/10 lg:mx-0"
          >
            <Image
              src={member.image}
              alt={member.imageAlt}
              width={237}
              height={357}
              sizes="(min-width: 1024px) 320px, 60vw"
              className="h-auto w-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <p className="eyebrow">The team</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Meet {member.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-accent">{member.role}</p>

            <div className="mt-8 grid gap-5">
              {member.bio.map((paragraph) => (
                <p key={paragraph} className="leading-7 text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>

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
