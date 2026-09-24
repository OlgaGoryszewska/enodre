import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { BEFORE_COLOR, TRACK_COLOR } from "./chart-constants";

type DumbbellChartProps = {
  metrics: ExpertiseMetric[];
  color: string;
};

export function DumbbellChart({ metrics, color }: DumbbellChartProps) {
  return (
    <div className="grid gap-10">
      {metrics.map((metric, index) => {
        const left = Math.min(metric.beforePct, metric.afterPct);
        const width = Math.abs(metric.afterPct - metric.beforePct);
        return (
          <Reveal key={metric.label} delay={index * 0.08}>
            <div>
              <p className="text-sm font-semibold text-ink-muted">{metric.label}</p>

              <div className="relative mt-7 h-1.5 rounded-full" style={{ background: TRACK_COLOR }}>
                <div
                  className="absolute top-0 h-1.5 rounded-full"
                  style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: 0.3 }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full ring-4 ring-card"
                  style={{ left: `${metric.beforePct}%`, transform: "translate(-50%, -50%)", background: BEFORE_COLOR }}
                  aria-hidden="true"
                />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full ring-4 ring-card"
                  style={{ left: `${metric.afterPct}%`, transform: "translate(-50%, -50%)", background: color }}
                  aria-hidden="true"
                />
              </div>

              <div className="relative mt-3 h-5">
                <span
                  className="font-urbanist absolute -translate-x-1/2 text-xs font-semibold text-ink-muted"
                  style={{ left: `${metric.beforePct}%` }}
                >
                  {metric.before}
                </span>
                <span
                  className="font-urbanist absolute -translate-x-1/2 text-xs font-bold"
                  style={{ left: `${metric.afterPct}%`, color }}
                >
                  {metric.after}
                </span>
              </div>

              <p className="font-poppins mt-4 text-sm leading-6 text-ink-muted">{metric.benefit}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
