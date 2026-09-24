import { Reveal } from "@/components/motion/Reveal";
import type { ExpertiseMetric, MetricsChartType } from "@/lib/content";
import { BEFORE_COLOR } from "@/components/charts/chart-constants";
import { DumbbellChart } from "@/components/charts/DumbbellChart";
import { SlopeChart } from "@/components/charts/SlopeChart";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { RadialGaugeChart } from "@/components/charts/RadialGaugeChart";
import { BulletChart } from "@/components/charts/BulletChart";
import { ArrowPlot } from "@/components/charts/ArrowPlot";
import { SplitBarChart } from "@/components/charts/SplitBarChart";

type ServicePerformanceSectionProps = {
  title: string;
  metrics: ExpertiseMetric[];
  color: string;
  chart: MetricsChartType;
  orientation?: "horizontal" | "vertical";
};

export function ServicePerformanceSection({ title, metrics, color, chart, orientation }: ServicePerformanceSectionProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
            {title}
          </p>
          <p className="font-funnel-display mt-4 text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            What this service actually changes
          </p>
          <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
            Typical improvements once the work ships.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mt-8 flex items-center gap-6 text-xs font-medium text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: BEFORE_COLOR }} aria-hidden="true" />
              Before
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
              After
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 rounded-[28px] bg-card p-8 shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] sm:p-12">
            {chart === "dumbbell" && <DumbbellChart metrics={metrics} color={color} />}
            {chart === "slope" && <SlopeChart metrics={metrics} color={color} orientation={orientation} />}
            {chart === "grouped-bar" && <GroupedBarChart metrics={metrics} color={color} />}
            {chart === "radial-gauge" && <RadialGaugeChart metrics={metrics} color={color} />}
            {chart === "bullet" && <BulletChart metrics={metrics} color={color} />}
            {chart === "arrow" && <ArrowPlot metrics={metrics} color={color} />}
            {chart === "split-bar" && <SplitBarChart metrics={metrics} color={color} orientation={orientation} />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
