"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { randomAffirmation } from "@/lib/affirmations";

interface Toast {
  id: number;
  message: string;
}

const AffirmationContext = createContext<(() => void) | null>(null);

// Called after each individual save (a mood pick, a journal entry, a
// calorie log, a workout log) — every submission gets its own toast rather
// than being batched, per the "individual note" requirement.
export function useAffirmation() {
  const trigger = useContext(AffirmationContext);
  if (!trigger) {
    throw new Error("useAffirmation must be used within an AffirmationProvider");
  }
  return trigger;
}

export function AffirmationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const trigger = useCallback(() => {
    const id = idRef.current++;
    setToasts((current) => [...current, { id, message: randomAffirmation() }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  return (
    <AffirmationContext.Provider value={trigger}>
      {children}

      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="font-romantic max-w-xs rounded-full border border-accent/20 bg-card/70 px-6 py-2.5 text-center text-sm tracking-wide text-accent shadow-md backdrop-blur"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AffirmationContext.Provider>
  );
}
