import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { BEFORE_COLOR, TRACK_COLOR, achievementScale } from "./chart-constants";

type RadialGaugeChartProps = {
  metrics: ExpertiseMetric[];
  color: string;
};

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

function Gauge({ metric, color }: { metric: ExpertiseMetric; color: string }) {
  const scale = achievementScale(metric);
  const angleDeg = (scale.before / 100) * 360 - 90;
  const rad = (angleDeg * Math.PI) / 180;
  const markerX = 50 + R * Math.cos(rad);
  const markerY = 50 + R * Math.sin(rad);
  const dash = (scale.after / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx={50} cy={50} r={R} fill="none" stroke={TRACK_COLOR} strokeWidth={8} />
          <circle
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <circle cx={markerX} cy={markerY} r={3.5} fill={BEFORE_COLOR} stroke="var(--card, #fff)" strokeWidth={1.5} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-[11px] font-semibold text-ink-muted line-through decoration-2">{metric.before}</span>
          <span className="font-urbanist text-2xl font-bold" style={{ color }}>
            {metric.after}
          </span>
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold text-ink-muted">{metric.label}</p>
      <p className="font-poppins mt-3 max-w-[200px] text-sm leading-6 text-ink-muted">{metric.benefit}</p>
    </div>
  );
}

export function RadialGaugeChart({ metrics, color }: RadialGaugeChartProps) {
  return (
    <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
      {metrics.map((metric, index) => (
        <Reveal key={metric.label} delay={index * 0.08}>
          <Gauge metric={metric} color={color} />
        </Reveal>
      ))}
    </div>
  );
}
