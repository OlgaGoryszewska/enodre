"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}
    </motion.span>
  );
}

interface ScrollRevealHeadingProps {
  text: string;
  className?: string;
  as?: "h1" | "h2";
  /**
   * "view" (default): words light up as the heading scrolls into the viewport.
   * Use for anything below the fold.
   * "page": words light up over a fixed window of page scroll from the top.
   * Only for above-the-fold headings, which are already visible on load so
   * "view" would resolve instantly instead of animating.
   */
  mode?: "view" | "page";
  pageScrollRange?: [number, number];
}

export function ScrollRevealHeading({
  text,
  className,
  as = "h2",
  mode = "view",
  pageScrollRange = [0, 350],
}: ScrollRevealHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollY, scrollYProgress: viewProgress } = useScroll(
    mode === "view" ? { target: ref, offset: ["start 0.9", "start 0.35"] } : {}
  );
  const pageProgress = useTransform(scrollY, pageScrollRange, [0, 1]);
  const progress = mode === "page" ? pageProgress : viewProgress;
  const words = text.split(" ");
  const Tag = as;

  return (
    <Tag ref={ref} className={className}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <span key={`${word}-${i}`}>
            <Word word={word} progress={progress} range={[start, end]} />
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </Tag>
  );
}
