import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { BEFORE_COLOR } from "./chart-constants";

type GroupedBarChartProps = {
  metrics: ExpertiseMetric[];
  color: string;
};

function Bar({ value, pct, tint, isAfter }: { value: string; pct: number; tint: string; isAfter?: boolean }) {
  return (
    <div className="relative h-40 w-10">
      <span
        className={`font-urbanist absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs ${
          isAfter ? "font-bold" : "font-semibold text-ink-muted"
        }`}
        style={{ bottom: `calc(${pct}% + 8px)`, color: isAfter ? tint : undefined }}
      >
        {value}
      </span>
      <div
        className="absolute bottom-0 left-0 w-full rounded-t-lg"
        style={{ height: `${pct}%`, background: tint }}
      />
    </div>
  );
}

export function GroupedBarChart({ metrics, color }: GroupedBarChartProps) {
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
      {metrics.map((metric, index) => (
        <Reveal key={metric.label} delay={index * 0.08}>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-end gap-4">
              <Bar value={metric.before} pct={metric.beforePct} tint={BEFORE_COLOR} />
              <Bar value={metric.after} pct={metric.afterPct} tint={color} isAfter />
            </div>
            <p className="mt-5 text-sm font-semibold text-ink-muted">{metric.label}</p>
            <p className="font-poppins mt-3 text-sm leading-6 text-ink-muted">{metric.benefit}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
