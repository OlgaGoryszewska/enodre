"use client";

import { Reveal } from "@/components/motion/Reveal";
import { processPhases } from "@/lib/content";

const AREA_CLASS = [
  "lg:[grid-area:a]",
  "lg:[grid-area:b]",
  "lg:[grid-area:c]",
  "lg:[grid-area:d]",
  "lg:[grid-area:e]",
  "lg:[grid-area:f]",
  "lg:[grid-area:g]",
];

const TILE_CLASS = [
  "bg-[#AAB4D9] text-[#1D1B3A]",
  "bg-[#6B6884] text-white",
  "bg-[#E8EAF6] text-[#1D1B3A]",
  "bg-[#5D6FA3] text-white",
  "bg-[#E4E7F5] text-[#1D1B3A]",
  "bg-[#1E1B3A] text-white",
  "bg-[#B7C0E0] text-[#1D1B3A]",
];

const TILE_HOVER =
  "transition-colors duration-300 hover:bg-[linear-gradient(135deg,#A8FFC0_0%,#4ADE80_100%)] hover:text-[#0F2E1C]";

const steps = processPhases.flatMap((phase) => phase.subSteps);

export function ProcessSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Our working process</p>
          <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
            Great products start with a bold strategy. We dissect every phase, refine for efficiency, and push
            boundaries to build a product that exceeds the highest standards.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="mt-14 grid overflow-hidden rounded-3xl lg:grid-cols-3 lg:[grid-template-areas:'a_b_c'_'a_d_e'_'f_g_g']"
          >
            {steps.map((step, index) => {
              const tileClass = TILE_CLASS[index % TILE_CLASS.length];
              return (
                <div
                  key={step.title}
                  className={`cursor-pointer p-8 sm:p-10 lg:min-h-[220px] ${AREA_CLASS[index % AREA_CLASS.length]} ${tileClass} ${TILE_HOVER}`}
                >
                  <span className="font-urbanist block text-4xl font-bold leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="font-poppins mt-3 text-sm leading-6 opacity-80">{step.description}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
