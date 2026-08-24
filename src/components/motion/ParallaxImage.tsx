"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxImageProps {
  children: ReactNode;
  className?: string;
  distance?: number;
}

export function ParallaxImage({ children, className = "", distance = 28 }: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y, top: -distance, bottom: -distance }}
        className="absolute inset-x-0"
      >
        {children}
      </motion.div>
    </div>
  );
}
