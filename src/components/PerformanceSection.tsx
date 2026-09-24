import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const BEFORE_COLOR = "#C7CBDC";
const AFTER_COLOR = "#1B9159";

const METRICS = [
  {
    label: "Avg. page load time",
    before: "4.2s",
    after: "1.6s",
    beforePct: 100,
    afterPct: 38,
    benefit: "62% faster page loads — trimmed bundles, optimized queries, and cached data where it counts.",
  },
  {
    label: "Critical bugs per month",
    before: "12",
    after: "3",
    beforePct: 100,
    afterPct: 25,
    benefit: "75% fewer critical bugs — the riskiest issues get caught in review, before they reach production.",
  },
  {
    label: "New engineer ramp-up time",
    before: "6 wks",
    after: "2 wks",
    beforePct: 100,
    afterPct: 33,
    benefit: "3x faster onboarding — a clean, documented codebase means new hires ship sooner.",
  },
];

export function PerformanceSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9EA5C3]">Software Code Audit</p>
          <p className="font-funnel-display mt-4 text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            What a code audit actually changes
          </p>
          <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
            Typical improvements once the findings from an audit get addressed.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mt-8 flex items-center gap-6 text-xs font-medium text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: BEFORE_COLOR }} aria-hidden="true" />
              Before audit
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: AFTER_COLOR }} aria-hidden="true" />
              After audit
            </span>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {METRICS.map((metric, index) => (
            <Reveal key={metric.label} delay={index * 0.08}>
              <div className="h-full rounded-[28px] bg-card p-8 shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-20px_rgba(30,30,60,0.25)]">
                <p className="text-sm font-semibold text-ink-muted">{metric.label}</p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-urbanist text-xl font-semibold text-ink-muted line-through decoration-2">
                    {metric.before}
                  </span>
                  <ArrowRight className="h-4 w-4 flex-none text-ink-muted" aria-hidden="true" />
                  <span className="font-urbanist text-4xl font-bold" style={{ color: AFTER_COLOR }}>
                    {metric.after}
                  </span>
                </div>

                <div className="mt-6 grid gap-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDEDF2]">
                    <div className="h-full rounded-full" style={{ width: `${metric.beforePct}%`, background: BEFORE_COLOR }} />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDEDF2]">
                    <div className="h-full rounded-full" style={{ width: `${metric.afterPct}%`, background: AFTER_COLOR }} />
                  </div>
                </div>

                <p className="font-poppins mt-6 text-sm leading-6 text-ink-muted">{metric.benefit}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
