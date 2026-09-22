"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

export function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="grid gap-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <Reveal key={item.question} delay={index * 0.04}>
            <div className="overflow-hidden rounded-[28px] bg-card shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)]">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 p-7 text-left"
              >
                <span className="text-lg font-semibold tracking-tight text-[#1D1D1F]">{item.question}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-none text-ink-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="font-poppins px-7 pb-7 text-sm leading-7 text-ink-muted">{item.answer}</p>
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
