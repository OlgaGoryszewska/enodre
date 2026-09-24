import type { ExpertiseProcessStep } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

const AREA_CLASS = ["lg:[grid-area:a]", "lg:[grid-area:b]", "lg:[grid-area:c]", "lg:[grid-area:d]", "lg:[grid-area:e]"];

const TILE_CLASS = [
  "bg-[#AAB4D9] text-[#1D1B3A]",
  "bg-[#6B6884] text-white",
  "bg-[#E8EAF6] text-[#1D1B3A]",
  "bg-[#5D6FA3] text-white",
  "bg-[#E4E7F5] text-[#1D1B3A]",
];

const TILE_HOVER =
  "transition-colors duration-300 hover:bg-[linear-gradient(135deg,#A8FFC0_0%,#4ADE80_100%)] hover:text-[#0F2E1C]";

export function ServiceProcess({ title, steps }: { title: string; steps: ExpertiseProcessStep[] }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            How we approach {title.toLowerCase()}
          </p>
          <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
            A process shaped around this specific service — not a generic template reused across everything we do.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-14 grid overflow-hidden rounded-3xl lg:grid-cols-3 lg:[grid-template-areas:'a_b_c'_'a_d_e']">
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
