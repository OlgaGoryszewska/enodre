"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { processPhases } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

function DotGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 [background-image:radial-gradient(rgba(15,82,186,0.18)_1px,transparent_1px)] [background-size:18px_18px]",
        className
      )}
      aria-hidden="true"
    />
  );
}

function TagCluster({ tags }: { tags: string[] }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-black/10 bg-background p-8">
      <DotGrid />
      <div className="relative flex flex-wrap items-center justify-center gap-3">
        {tags.map((tag, index) => (
          <span
            key={tag}
            style={{ transform: `translateY(${index % 2 === 0 ? "-6px" : "10px"})` }}
            className="rounded-full border border-accent/30 bg-card px-4 py-1.5 text-xs font-medium text-foreground shadow-sm"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiscoverIllustration({ tags }: { tags: string[] }) {
  return (
    <div className="grid h-full gap-4 sm:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-background p-6">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 via-accent/5 to-transparent">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-card text-sm font-semibold text-foreground shadow-sm">
            Discover
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-full border border-black/10 bg-card px-3 py-1.5">
          <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span className="h-1.5 w-6 rounded-full bg-accent/40" aria-hidden="true" />
          <span className="h-1.5 w-1.5 rounded-full bg-black/15" aria-hidden="true" />
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-ink-muted">
          <span>Interview</span>
          <span>Research</span>
          <span>Roadmap</span>
        </div>
      </div>
      <TagCluster tags={tags} />
    </div>
  );
}

function DesignDevelopmentIllustration() {
  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-black/10 bg-background">
      <Image
        src="/design-and-develop-process.png"
        alt="Design and development process"
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-contain p-4"
      />
    </div>
  );
}

export function ProcessSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhase = processPhases[activeIndex];

  function goTo(index: number) {
    setActiveIndex(((index % processPhases.length) + processPhases.length) % processPhases.length);
  }

  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="eyebrow">Our working process</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Great products start with a bold strategy. We dissect every phase, refine for efficiency, and push
            boundaries to build a product that exceeds the highest standards.
          </h2>
          <p className="mt-4 text-ink-muted">No fluff — just a clear, streamlined process designed for real results.</p>
        </Reveal>

        <Reveal delay={0.1}>
          {/* Mobile: one phase at a time — counter, current label, arrows.
              The full tab row wraps unpredictably at narrow widths, so it's
              desktop-only (see below). */}
          <div className="mt-10 flex items-center justify-between gap-2 rounded-full border border-black/10 bg-card p-2 sm:hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-xs font-medium text-ink-muted">
              {activeIndex + 1}/{processPhases.length}
            </span>
            <span className="rounded-full border border-accent/40 bg-background px-5 py-2 text-sm font-semibold text-foreground">
              {activePhase.tabLabel}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous phase"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-ink-muted transition hover:border-black/25 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next phase"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-ink-muted transition hover:border-black/25 hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className="mt-10 hidden items-center gap-2 rounded-full border border-black/10 bg-card p-2 sm:flex">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous phase"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-ink-muted transition hover:border-black/25 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next phase"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-ink-muted transition hover:border-black/25 hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {processPhases.map((phase, index) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  index === activeIndex
                    ? "border border-accent/40 bg-background text-foreground"
                    : "text-ink-muted hover:text-foreground"
                )}
              >
                {phase.tabLabel}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-4 grid overflow-hidden rounded-2xl border border-black/10 bg-card sm:grid-cols-2">
            <div className="flex flex-col justify-center gap-8 p-8 sm:p-10">
              {activePhase.subSteps.map((step) => (
                <div key={step.title}>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">{step.title}</h3>
                  <p className="mt-2 leading-7 text-ink-muted">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="min-h-[320px] p-4 sm:p-6">
              {activePhase.id === "discover-planning" ? (
                <DiscoverIllustration tags={activePhase.tags} />
              ) : activePhase.id === "design-development" ? (
                <DesignDevelopmentIllustration />
              ) : (
                <TagCluster tags={activePhase.tags} />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
