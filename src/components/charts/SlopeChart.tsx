import type { ExpertiseMetric } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { BEFORE_COLOR } from "./chart-constants";

type SlopeChartProps = {
  metrics: ExpertiseMetric[];
  color: string;
  orientation?: "horizontal" | "vertical";
};

const PANEL_W = 160;
const PANEL_H = 112;
const PAD = 8;

function Panel({ metric, color }: { metric: ExpertiseMetric; color: string }) {
  const y1 = PANEL_H - PAD - (metric.beforePct / 100) * (PANEL_H - PAD * 2);
  const y2 = PANEL_H - PAD - (metric.afterPct / 100) * (PANEL_H - PAD * 2);
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-semibold text-ink-muted">{metric.label}</p>
      <div className="relative mx-auto mt-6" style={{ width: PANEL_W, height: PANEL_H }}>
        <svg viewBox={`0 0 ${PANEL_W} ${PANEL_H}`} className="h-full w-full overflow-visible">
          <line x1={0} y1={y1} x2={PANEL_W} y2={y2} stroke={color} strokeWidth={2} strokeLinecap="round" />
          <circle cx={0} cy={y1} r={4.5} fill={BEFORE_COLOR} />
          <circle cx={PANEL_W} cy={y2} r={5} fill={color} />
        </svg>
        <span
          className="font-urbanist absolute -translate-x-1/2 -translate-y-full pb-1.5 text-xs font-semibold whitespace-nowrap text-ink-muted"
          style={{ left: 0, top: `${(y1 / PANEL_H) * 100}%` }}
        >
          {metric.before}
        </span>
        <span
          className="font-urbanist absolute -translate-x-full -translate-y-full pb-1.5 text-xs font-bold whitespace-nowrap"
          style={{ left: PANEL_W, top: `${(y2 / PANEL_H) * 100}%`, color }}
        >
          {metric.after}
        </span>
      </div>
      <div className="mx-auto mt-2 flex justify-between text-[10px] font-semibold tracking-wide text-ink-muted/70 uppercase" style={{ width: PANEL_W }}>
        <span>Before</span>
        <span>After</span>
      </div>
      <p className="font-poppins mt-5 max-w-[220px] text-sm leading-6 text-ink-muted">{metric.benefit}</p>
    </div>
  );
}

const ROW_W = 100;
const ROW_H = 56;
const ROW_Y1 = 10;
const ROW_Y2 = 46;

function Row({ metric, color }: { metric: ExpertiseMetric; color: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="sm:w-48 sm:flex-none">
        <p className="text-sm font-semibold text-ink-muted">{metric.label}</p>
        <p className="font-poppins mt-1 text-xs leading-5 text-ink-muted">{metric.benefit}</p>
      </div>
      <div className="relative h-14 flex-1">
        <svg viewBox={`0 0 ${ROW_W} ${ROW_H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <line x1={metric.beforePct} y1={ROW_Y1} x2={metric.afterPct} y2={ROW_Y2} stroke={color} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle cx={metric.beforePct} cy={ROW_Y1} r={3} fill={BEFORE_COLOR} vectorEffect="non-scaling-stroke" />
          <circle cx={metric.afterPct} cy={ROW_Y2} r={3.5} fill={color} vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="font-urbanist absolute -translate-x-1/2 -translate-y-full pb-1 text-xs font-semibold whitespace-nowrap text-ink-muted"
          style={{ left: `${metric.beforePct}%`, top: `${(ROW_Y1 / ROW_H) * 100}%` }}
        >
          {metric.before}
        </span>
        <span
          className="font-urbanist absolute -translate-x-1/2 pt-1 text-xs font-bold whitespace-nowrap"
          style={{ left: `${metric.afterPct}%`, top: `${(ROW_Y2 / ROW_H) * 100}%`, color }}
        >
          {metric.after}
        </span>
      </div>
    </div>
  );
}

export function SlopeChart({ metrics, color, orientation = "horizontal" }: SlopeChartProps) {
  if (orientation === "vertical") {
    return (
      <div className="grid gap-10">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 0.08}>
            <Row metric={metric} color={color} />
          </Reveal>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
      {metrics.map((metric, index) => (
        <Reveal key={metric.label} delay={index * 0.08}>
          <Panel metric={metric} color={color} />
        </Reveal>
      ))}
    </div>
  );
}
