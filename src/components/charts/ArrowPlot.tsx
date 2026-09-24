import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { BEFORE_COLOR, TRACK_COLOR } from "./chart-constants";

type ArrowPlotProps = {
  metrics: ExpertiseMetric[];
  color: string;
};

function ArrowRow({ metric, color }: { metric: ExpertiseMetric; color: string }) {
  const forward = metric.afterPct >= metric.beforePct;
  const left = Math.min(metric.beforePct, metric.afterPct);
  const width = Math.abs(metric.afterPct - metric.beforePct);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <p className="text-sm font-semibold text-ink-muted sm:w-48 sm:flex-none">{metric.label}</p>

      <div className="relative h-2 flex-1">
        <div className="absolute top-1/2 h-px w-full -translate-y-1/2" style={{ background: TRACK_COLOR }} />
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full"
          style={{ left: `${left}%`, width: `${width}%`, background: color }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
          style={{ left: `${metric.beforePct}%`, background: BEFORE_COLOR }}
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 h-0 w-0 -translate-y-1/2"
          style={
            forward
              ? {
                  left: `${metric.afterPct}%`,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: `7px solid ${color}`,
                }
              : {
                  left: `${metric.afterPct}%`,
                  transform: "translate(-100%, -50%)",
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderRight: `7px solid ${color}`,
                }
          }
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-none items-baseline gap-2 sm:w-40 sm:justify-end">
        <span className="font-urbanist text-xs font-semibold text-ink-muted line-through decoration-2">{metric.before}</span>
        <span className="font-urbanist text-base font-bold" style={{ color }}>
          {metric.after}
        </span>
      </div>
    </div>
  );
}

export function ArrowPlot({ metrics, color }: ArrowPlotProps) {
  return (
    <div className="grid gap-8">
      {metrics.map((metric, index) => (
        <Reveal key={metric.label} delay={index * 0.08}>
          <div>
            <ArrowRow metric={metric} color={color} />
            <p className="font-poppins mt-3 text-sm leading-6 text-ink-muted sm:ml-[calc(12rem+1.5rem)]">{metric.benefit}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
