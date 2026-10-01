"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function FloatingCta() {
  const [scrolledPast, setScrolledPast] = useState(false);
  const [targetInView, setTargetInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById("get-in-touch");
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => setTargetInView(entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const visible = scrolledPast && !targetInView;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 right-5 z-30"
        >
          <Link
            href="/#get-in-touch"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-[0_12px_32px_-8px_rgba(23,33,27,0.5)] transition hover:opacity-90"
          >
            <span>Get in touch</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
