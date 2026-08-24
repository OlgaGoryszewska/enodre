"use client";

import type { ComponentType } from "react";
import { motion, type Variants } from "framer-motion";
import { Bot, Code2, Database, Mail, Palette, Sparkles, SquareTerminal } from "lucide-react";
import {
  SiClaude,
  SiCursor,
  SiFigma,
  SiNextdotjs,
  SiPwa,
  SiReact,
  SiStripe,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";
import type { StackGroup } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollRevealHeading } from "@/components/motion/ScrollRevealHeading";

interface StackSectionProps {
  groups: StackGroup[];
}

type Icon = ComponentType<{ className?: string }>;

// Not every tool has an official mark in simple-icons (VS Code, Midjourney,
// Canva, and OpenAI's products don't), so those fall back to a generic
// Lucide icon instead.
const STACK_ICONS: Record<string, Icon> = {
  "Visual Studio Code": Code2,
  Figma: SiFigma,
  Midjourney: Sparkles,
  Canva: Palette,
  Claude: SiClaude,
  Codex: SquareTerminal,
  ChatGPT: Bot,
  Cursor: SiCursor,
  "Next.js": SiNextdotjs,
  React: SiReact,
  "React Native": SiReact,
  PWA: SiPwa,
  "Tailwind CSS": SiTailwindcss,
  TypeScript: SiTypescript,
  "SQL (backend)": Database,
  Supabase: SiSupabase,
  Stripe: SiStripe,
  Nodemailer: Mail,
};

const pillContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const pillItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function PillGroup({ items }: { items: string[] }) {
  return (
    <motion.div
      className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2"
      variants={pillContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {items.map((item) => {
        const Icon = STACK_ICONS[item];
        return (
          <motion.span
            key={item}
            variants={pillItem}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-background/80 transition hover:border-white/40 hover:text-background"
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {item}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

export function StackSection({ groups }: StackSectionProps) {
  return (
    <section className="bg-foreground py-20 text-background sm:py-28">
      <div className="shell">
        <Reveal className="text-center">
          <p className="eyebrow">Tools & stack</p>
          <ScrollRevealHeading
            text={groups[0]?.heading ?? ""}
            className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
          />
        </Reveal>

        <PillGroup items={groups[0]?.items ?? []} />

        {groups.slice(1).map((group) => (
          <div key={group.heading} className="mt-16 text-center">
            <Reveal>
              <h3 className="text-xl font-semibold tracking-tight">{group.heading}</h3>
            </Reveal>
            <PillGroup items={group.items} />
          </div>
        ))}
      </div>
    </section>
  );
}
