"use client";

import { Reveal } from "@/components/motion/Reveal";
import { processPhases } from "@/lib/content";

export function ProcessSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="eyebrow">Our working process</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Great products start with a bold strategy. We dissect every phase, refine for efficiency, and push
            boundaries to build a product that exceeds the highest standards.
          </h2>
          <p className="mt-4 text-ink-muted">No fluff — just a clear, streamlined process designed for real results.</p>
        </Reveal>

        <div className="relative mt-14 max-w-2xl">
          <div className="absolute bottom-2 left-4 top-2 w-px bg-black/10" aria-hidden="true" />
          <div className="grid gap-10">
            {processPhases.map((phase, index) => (
              <Reveal key={phase.id} delay={index * 0.08}>
                <div className="relative pl-12">
                  <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-accent/40 bg-card text-sm font-semibold text-accent">
                    {index + 1}
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">{phase.tabLabel}</h3>
                  <div className="mt-3 grid gap-3">
                    {phase.subSteps.map((step) => (
                      <p key={step.title} className="leading-7 text-ink-muted">
                        {phase.subSteps.length > 1 && (
                          <span className="font-semibold text-foreground">{step.title}: </span>
                        )}
                        {step.description}
                      </p>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
