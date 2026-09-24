"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FileText, LayoutGrid, Phone, Rocket } from "lucide-react";
import { ChallengeForm } from "@/components/challenge/ChallengeForm";
import { founder } from "@/lib/content";

const steps = [
  { icon: Phone, label: "Discovery Call" },
  { icon: LayoutGrid, label: "Analyze Your Requirements" },
  { icon: FileText, label: "Get a Detailed Proposal" },
  { icon: Rocket, label: "Kick Off Your Project" },
];

export function ChallengeSection() {
  return (
    <section id="get-in-touch" className="border-t border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-black/10 shadow-[0_1px_2px_rgba(23,33,27,0.04),0_20px_45px_-25px_rgba(23,33,27,0.25)] lg:grid-cols-[1fr_1.3fr]"
        >
          <div className="relative overflow-hidden bg-foreground p-8 text-background sm:p-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:20px_20px]"
              aria-hidden="true"
            />
            <div className="relative">
              <h2 className="font-funnel-display text-3xl leading-tight sm:text-4xl">
                Get in Touch
                <br />
                to Start the Discussion
              </h2>

              <div className="mt-10 overflow-hidden rounded-2xl bg-white/5">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 border-b border-white/10 px-4 py-4 last:border-b-0"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-background/70" aria-hidden="true" />
                      <span className="text-sm font-medium text-background/90">
                        {index + 1}. {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 flex items-center gap-3">
                <Image
                  src={founder.image!}
                  alt={founder.imageAlt!}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-background">{founder.name}</p>
                  <p className="text-xs text-background/70">{founder.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 sm:p-10">
            <ChallengeForm />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
