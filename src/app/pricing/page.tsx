import type { Metadata } from "next";
import Link from "next/link";
import { howWeWork, partnershipPlans, projectPricing } from "@/lib/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Straightforward pricing for small and growing businesses — typical starting points and timelines, not fixed packages.",
};

export default function PricingPage() {
  return (
    <>
      <section className="shell py-20 sm:py-28">
        <p className="eyebrow">Pricing</p>
        <h1 className="page-title mt-6 max-w-4xl">Straightforward pricing for small and growing businesses.</h1>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-ink-muted">
          Every project is scoped to what you actually need — these are typical starting points and timelines, not fixed packages. A quick discovery call narrows down the real number.
        </p>

        <div className="mt-20">
          <p className="eyebrow">Project pricing</p>
          <div className="mt-8 hidden border-b border-black/15 pb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid sm:grid-cols-[1fr_160px_140px] sm:gap-6">
            <span>Service</span>
            <span>Starting from</span>
            <span>Timeline</span>
          </div>
          <div className="border-t border-black/15 sm:border-t-0">
            {projectPricing.map((item) => (
              <div
                key={item.service}
                className="grid gap-1 border-b border-black/15 py-6 sm:grid-cols-[1fr_160px_140px] sm:items-center sm:gap-6 sm:py-5"
              >
                <p className="font-medium leading-6">{item.service}</p>
                <p className="font-mono text-sm text-accent">{item.price}</p>
                <p className="text-sm text-ink-muted">{item.timeline}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 rounded-2xl border border-black/10 bg-card p-6 text-sm leading-7 text-ink-muted">
            Larger or multi-phase builds (enterprise-scale infrastructure, complex third-party integrations) are scoped individually after discovery — typically{" "}
            <span className="font-semibold text-foreground">$12,000–$35,000+</span>.
          </p>
        </div>
      </section>

      <section className="border-y border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <p className="eyebrow">Monthly partnership</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            For businesses that want ongoing frontend support without hiring in-house.
          </h2>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {partnershipPlans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col rounded-2xl border p-8",
                  plan.highlighted ? "border-accent bg-white shadow-[0_1px_2px_rgba(23,33,27,0.04),0_20px_45px_-25px_rgba(23,33,27,0.25)]" : "border-black/10 bg-card"
                )}
              >
                {plan.badge && (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-background">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>{" "}
                  <span className="text-ink-muted">{plan.cadence}</span>
                </p>
                <ul className="mt-6 grid gap-3 text-sm leading-6 text-ink-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">–</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background"
              href="/#get-in-touch"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
              <span>Talk to us about your project</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="shell py-20 sm:py-28">
        <p className="eyebrow">How we work</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          From first call to shipped software.
        </h2>

        <div className="mt-12 border-t border-black/15">
          {howWeWork.map((step, index) => (
            <div key={step.title} className="grid gap-3 border-b border-black/15 py-8 sm:grid-cols-[4rem_1fr_2fr]">
              <p className="font-mono text-xs text-accent">0{index + 1}</p>
              <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="leading-7 text-ink-muted">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-2 border-t border-black/15 pt-8 text-sm leading-7 text-ink-muted">
          <p>
            <span className="font-semibold text-foreground">Payment terms:</span> 50% deposit to begin, 50% on delivery. Retainers billed monthly in advance.
          </p>
          <p>Prices valid as of July 2026 and reflect typical scope — final quotes confirmed after discovery.</p>
        </div>
      </section>
    </>
  );
}
