import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { TRACK_COLOR, achievementScale } from "./chart-constants";

type BulletChartProps = {
  metrics: ExpertiseMetric[];
  color: string;
};

export function BulletChart({ metrics, color }: BulletChartProps) {
  return (
    <div className="grid gap-9">
      {metrics.map((metric, index) => {
        const scale = achievementScale(metric);
        return (
          <Reveal key={metric.label} delay={index * 0.08}>
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-semibold text-ink-muted">{metric.label}</p>
                <p className="font-urbanist text-2xl font-bold" style={{ color }}>
                  {metric.after}
                </p>
              </div>

              <div className="relative mt-4 h-3 rounded-full" style={{ background: TRACK_COLOR }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${scale.after}%`, background: color }}
                />
                <div
                  className="absolute -top-1.5 -bottom-1.5 w-[3px] -translate-x-1/2 rounded-full bg-[#5B5B68]"
                  style={{ left: `${scale.before}%` }}
                  aria-hidden="true"
                />
              </div>

              <div className="relative mt-2 h-4">
                <span
                  className="font-urbanist absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-ink-muted"
                  style={{ left: `${scale.before}%` }}
                >
                  was {metric.before}
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
