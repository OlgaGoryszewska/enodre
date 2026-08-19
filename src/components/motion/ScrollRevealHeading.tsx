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
}

export function ScrollRevealHeading({ text, className }: ScrollRevealHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  // Tied to page scroll position (not viewport entry) since this heading sits
  // above the fold and is already in view on load.
  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, [0, 350], [0, 1]);
  const words = text.split(" ");

  return (
    <h1 ref={ref} className={className}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <span key={`${word}-${i}`}>
            <Word word={word} progress={scrollYProgress} range={[start, end]} />
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </h1>
  );
}
