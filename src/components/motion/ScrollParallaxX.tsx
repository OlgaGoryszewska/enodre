"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollParallaxXProps {
  children: ReactNode;
  className?: string;
  /** Horizontal offset (px) at scroll 0; settles at 0 once scrollRange is passed. */
  distance?: number;
  /** Page-scroll window (px) that drives the motion. */
  scrollRange?: [number, number];
}

export function ScrollParallaxX({ children, className, distance = 32, scrollRange = [0, 350] }: ScrollParallaxXProps) {
  const { scrollY } = useScroll();
  const x = useTransform(scrollY, scrollRange, [distance, 0]);

  return (
    <motion.div style={{ x }} className={className}>
      {children}
    </motion.div>
  );
}
