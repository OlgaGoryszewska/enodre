import type { Metadata } from "next";
import Link from "next/link";
import { faqs } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { FaqAccordion } from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to the questions we hear most about starting a project, pricing, process, and support.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ | Enodre",
    description: "Answers to the questions we hear most about starting a project, pricing, process, and support.",
    url: "/faq",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <section className="shell py-20 sm:py-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Reveal>
        <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Frequently asked questions
        </p>
        <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
          Everything people usually ask before starting a project — how it works, what it costs, and what happens
          after launch. Can&apos;t find your answer here? Just ask.
        </p>
      </Reveal>

      <div className="mt-14 max-w-3xl">
        <FaqAccordion items={faqs} />
      </div>

      <Reveal>
        <div className="mt-16 flex max-w-3xl flex-col items-start gap-4 rounded-[28px] bg-foreground p-10 text-background sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-semibold tracking-tight">Still have questions?</p>
            <p className="font-poppins mt-2 text-sm text-background/70">
              Book a short call and we&apos;ll talk through your project directly.
            </p>
          </div>
          <Link
            href="/#get-in-touch"
            className="inline-flex flex-none items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:opacity-90"
          >
            <span>Get in touch</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
