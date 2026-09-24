import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { BEFORE_COLOR } from "./chart-constants";

type SplitBarChartProps = {
  metrics: ExpertiseMetric[];
  color: string;
  orientation?: "horizontal" | "vertical";
};

const AXIS_COLOR = "#D8D8E2";

function HorizontalRow({ metric, color }: { metric: ExpertiseMetric; color: string }) {
  const beforeWidth = metric.beforePct / 2;
  const afterWidth = metric.afterPct / 2;
  return (
    <div className="px-16 sm:px-20">
      <p className="text-center text-sm font-semibold text-ink-muted">{metric.label}</p>
      <div className="relative mt-5 h-3">
        <div className="absolute top-1/2 left-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2" style={{ background: AXIS_COLOR }} aria-hidden="true" />
        <div className="absolute top-0 right-1/2 h-3 rounded-l-full" style={{ width: `${beforeWidth}%`, background: BEFORE_COLOR }} />
        <div className="absolute top-0 left-1/2 h-3 rounded-r-full" style={{ width: `${afterWidth}%`, background: color }} />
        <span
          className="font-urbanist absolute top-1/2 -translate-y-1/2 translate-x-[-100%] pr-2 text-xs font-semibold whitespace-nowrap text-ink-muted"
          style={{ right: `calc(50% + ${beforeWidth}%)` }}
        >
          {metric.before}
        </span>
        <span
          className="font-urbanist absolute top-1/2 -translate-y-1/2 pl-2 text-xs font-bold whitespace-nowrap"
          style={{ left: `calc(50% + ${afterWidth}%)`, color }}
        >
          {metric.after}
        </span>
      </div>
      <p className="font-poppins mt-6 text-center text-sm leading-6 text-ink-muted">{metric.benefit}</p>
    </div>
  );
}

function VerticalColumn({ metric, color }: { metric: ExpertiseMetric; color: string }) {
  const beforeHeight = metric.beforePct / 2;
  const afterHeight = metric.afterPct / 2;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-40 w-12">
        <div className="absolute top-1/2 left-1/2 h-px w-14 -translate-x-1/2 -translate-y-1/2" style={{ background: AXIS_COLOR }} aria-hidden="true" />
        <div className="absolute bottom-1/2 left-0 w-full rounded-t-lg" style={{ height: `${beforeHeight}%`, background: BEFORE_COLOR }} />
        <div className="absolute top-1/2 left-0 w-full rounded-b-lg" style={{ height: `${afterHeight}%`, background: color }} />
        <span
          className="font-urbanist absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-ink-muted"
          style={{ bottom: `calc(50% + ${beforeHeight}% + 6px)` }}
        >
          {metric.before}
        </span>
        <span
          className="font-urbanist absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold"
          style={{ top: `calc(50% + ${afterHeight}% + 6px)`, color }}
        >
          {metric.after}
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-ink-muted">{metric.label}</p>
      <p className="font-poppins mt-3 text-sm leading-6 text-ink-muted">{metric.benefit}</p>
    </div>
  );
}

export function SplitBarChart({ metrics, color, orientation = "horizontal" }: SplitBarChartProps) {
  if (orientation === "vertical") {
    return (
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 0.08}>
            <VerticalColumn metric={metric} color={color} />
          </Reveal>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      {metrics.map((metric, index) => (
        <Reveal key={metric.label} delay={index * 0.08}>
          <HorizontalRow metric={metric} color={color} />
        </Reveal>
      ))}
    </div>
  );
}
