"use client";

import { motion } from "framer-motion";
import { ChallengeForm } from "@/components/challenge/ChallengeForm";

export function ChallengeSection() {
  return (
    <section id="get-in-touch" className="border-t border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <div className="mx-auto max-w-[720px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12 text-center sm:mb-16"
          >
            <p className="eyebrow">Untangle complexity</p>
            <h2 className="page-title mt-4 text-4xl sm:text-5xl">
              What would you like to untangle?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-ink-muted">
              Every business has bottlenecks. Whether it&apos;s repetitive
              work, disconnected systems, slow operations, or processes that
              simply don&apos;t scale, we&apos;d love to understand what
              you&apos;re facing.
              <br className="hidden sm:block" />
              <br className="hidden sm:block" />
              You don&apos;t need to know the solution. That&apos;s our job.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <ChallengeForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
