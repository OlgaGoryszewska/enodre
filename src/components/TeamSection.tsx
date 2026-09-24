"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Founder } from "@/lib/content";

interface TeamMemberProps {
  member: Founder;
  reverse?: boolean;
}

function TeamMember({ member, reverse }: TeamMemberProps) {
  const [expanded, setExpanded] = useState(false);
  const [intro, ...rest] = member.bio;
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
      <motion.div
        initial={{ opacity: 0, x: reverse ? 24 : -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`relative mx-auto aspect-square w-full max-w-xs overflow-hidden lg:mx-0 ${reverse ? "lg:order-2" : ""}`}
      >
        {member.image ? (
          <Image
            src={member.image}
            alt={member.imageAlt ?? member.name}
            width={237}
            height={357}
            sizes="(min-width: 1024px) 320px, 60vw"
            className="h-full w-full object-cover object-[center_20%]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#C7DBFF_0%,#E9F1FF_100%)]">
            <span className="font-urbanist text-7xl font-bold text-[#3661C4]">{initials}</span>
          </div>
        )}
      </motion.div>

      <div className={reverse ? "lg:order-1" : undefined}>
        <h3 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{member.name}</h3>
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

        {rest.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

interface TeamSectionProps {
  members: Founder[];
  ctaHref: string;
}

export function TeamSection({ members, ctaHref }: TeamSectionProps) {
  return (
    <section id="about" className="border-y border-black/10 bg-card py-20 sm:py-28">
      <div className="shell mb-14">
        <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Meet our team
        </p>
      </div>
      <div className="shell grid gap-20">
        {members.map((member, index) => (
          <TeamMember key={member.name} member={member} reverse={index % 2 === 1} />
        ))}
      </div>

      <div className="shell mt-12 flex justify-center">
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          href={ctaHref}
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
          <span>Send us a message</span>
        </Link>
      </div>
    </section>
  );
}
