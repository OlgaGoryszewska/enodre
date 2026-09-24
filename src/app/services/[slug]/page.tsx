import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { expertiseAreas, getExpertiseArea } from "@/lib/content";
import { ServiceProcess } from "@/components/ServiceProcess";
import { ServicePerformanceSection } from "@/components/ServicePerformanceSection";
import { WhyUsSection } from "@/components/WhyUsSection";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Reveal } from "@/components/motion/Reveal";

type ServicePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return expertiseAreas.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const area = getExpertiseArea((await params).slug);
  if (!area) return {};
  return {
    title: area.title,
    description: area.description,
    alternates: { canonical: `/services/${area.slug}` },
    openGraph: {
      title: `${area.title} | Enodre`,
      description: area.description,
      url: `/services/${area.slug}`,
      images: [{ url: area.image }],
    },
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const area = getExpertiseArea((await params).slug);
  if (!area) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: area.title,
    description: area.description,
    provider: { "@type": "ProfessionalService", name: "Enodre", url: "https://enodre.com" },
    serviceType: area.category,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: area.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="shell py-20 sm:py-28">
        <Link href="/services" className="text-sm font-semibold text-ink-muted hover:text-foreground">
          ← All services
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">{area.category}</p>
            <h1 className="font-funnel-display mt-4 text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
              {area.title}
            </h1>
            <p className="font-poppins mt-6 max-w-xl text-lg leading-8 text-ink-muted">{area.description}</p>
            <div className="mt-8">
              <Link
                href="/#get-in-touch"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
              >
                <span>Get in touch</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] shadow-[0_24px_48px_-20px_rgba(30,30,60,0.35)]">
              <Image src={area.image} alt={`${area.title} preview`} fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      <ServiceProcess title={area.title} steps={area.process} />

      <ServicePerformanceSection
        title={area.title}
        metrics={area.metrics}
        color={area.metricsColor}
        chart={area.metricsChart}
        orientation={area.metricsChartOrientation}
      />

      <WhyUsSection />

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              {area.title} FAQs
            </p>
            <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
              Common questions about this specific service — for everything else, see the{" "}
              <Link href="/faq" className="underline hover:text-foreground">
                full FAQ
              </Link>
              .
            </p>
          </Reveal>

          <div className="mt-14 max-w-3xl">
            <FaqAccordion items={area.faqs} />
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col items-start gap-4 rounded-[28px] bg-foreground p-10 text-background sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-semibold tracking-tight">Ready to talk about {area.title.toLowerCase()}?</p>
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
        </div>
      </section>
    </>
  );
}
