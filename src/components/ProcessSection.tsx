"use client";

import { Reveal } from "@/components/motion/Reveal";
import { processPhases } from "@/lib/content";

const PROCESS_COLORS = [
  { gradient: "linear-gradient(135deg, #E9F1FF 0%, #FFFFFF 100%)", accent: "#6B8CCE" },
  { gradient: "linear-gradient(135deg, #F3EEFF 0%, #FFFFFF 100%)", accent: "#8B7CC7" },
  { gradient: "linear-gradient(135deg, #EAFBF1 0%, #FFFFFF 100%)", accent: "#4FA97C" },
  { gradient: "linear-gradient(135deg, #FFF3E8 0%, #FFFFFF 100%)", accent: "#D9944B" },
  { gradient: "linear-gradient(135deg, #FFF0F6 0%, #FFFFFF 100%)", accent: "#D76BA0" },
];

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

        <div className="mt-14 grid max-w-2xl gap-4">
          {processPhases.map((phase, index) => {
            const color = PROCESS_COLORS[index % PROCESS_COLORS.length];
            return (
            <Reveal key={phase.id} delay={index * 0.08}>
              <div
                className="rounded-[28px] p-8 shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-20px_rgba(30,30,60,0.25)]"
                style={{ background: color.gradient }}
              >
                <div className="flex items-start gap-5">
                  <span
                    className="font-urbanist shrink-0 text-[32px] font-semibold leading-none"
                    style={{ color: color.accent }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-[#1D1D1F]">{phase.tabLabel}</h3>
                    <div className="mt-3 grid gap-2">
                      {phase.subSteps.map((step) => (
                        <p key={step.title} className="font-poppins text-sm leading-7 text-ink-muted">
                          {phase.subSteps.length > 1 && (
                            <span className="font-semibold text-[#1D1D1F]">{step.title}: </span>
                          )}
                          {step.description}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
