import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getIndustry, industries, products } from "@/lib/content";
import { WhyUsSection } from "@/components/WhyUsSection";
import { Reveal } from "@/components/motion/Reveal";

type IndustryPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return industries.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: IndustryPageProps): Promise<Metadata> {
  const industry = getIndustry((await params).slug);
  if (!industry) return {};
  return {
    title: `Software for ${industry.title}`,
    description: industry.metaDescription,
    alternates: { canonical: `/industries/${industry.slug}` },
    openGraph: {
      title: `Software for ${industry.title} | Enodre`,
      description: industry.metaDescription,
      url: `/industries/${industry.slug}`,
      images: industry.image ? [{ url: industry.image }] : undefined,
    },
  };
}

export default async function IndustryPage({ params }: IndustryPageProps) {
  const industry = getIndustry((await params).slug);
  if (!industry) notFound();

  const caseStudies = industry.caseStudySlugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Software development for ${industry.title}`,
    description: industry.metaDescription,
    provider: { "@type": "ProfessionalService", name: "Enodre", url: "https://enodre.com" },
    serviceType: industry.title,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://enodre.com" },
      { "@type": "ListItem", position: 2, name: "Industries", item: "https://enodre.com/industries" },
      { "@type": "ListItem", position: 3, name: industry.title, item: `https://enodre.com/industries/${industry.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="shell py-20 sm:py-28">
        <Link href="/industries" className="text-sm font-semibold text-ink-muted hover:text-foreground">
          ← All industries
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">Industries</p>
            <h1 className="font-funnel-display mt-4 text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
              {industry.title}
            </h1>
            <p className="font-poppins mt-6 max-w-xl text-lg leading-8 text-ink-muted">{industry.intro}</p>
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

          {industry.image && (
            <Reveal delay={0.1}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] shadow-[0_24px_48px_-20px_rgba(30,30,60,0.35)]">
                <Image
                  src={industry.image}
                  alt={`${industry.title} preview`}
                  fill
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <section className="border-y border-black/10 bg-card py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              What we build for {industry.title.toLowerCase()}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {industry.capabilities.map((capability, index) => (
              <Reveal key={capability} delay={index * 0.05}>
                <div className="flex items-start gap-3 rounded-2xl bg-background p-5 shadow-[0_12px_24px_-18px_rgba(30,30,60,0.3)]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" aria-hidden="true" />
                  <p className="text-sm leading-6 text-foreground">{capability}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="mb-10">
              <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">Examples of work</p>
              <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
                {caseStudies.length
                  ? `Software we've shipped in ${industry.title.toLowerCase()}.`
                  : `Software we've taken from idea to production — across industries.`}
              </p>
            </div>
          </Reveal>

          {caseStudies.length ? (
            <div className="grid gap-6">
              {caseStudies.map((product, index) => (
                <Reveal key={product.slug} delay={index * 0.08}>
                  <Link
                    href={`/products/${product.slug}`}
                    className="group grid overflow-hidden rounded-[28px] border border-black/5 bg-card shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(30,30,60,0.25)] sm:grid-cols-[0.9fr_1.1fr]"
                  >
                    {product.image && (
                      <div className="relative aspect-[4/3] bg-background sm:aspect-auto sm:h-full">
                        <Image
                          src={product.image}
                          alt={product.imageAlt ?? ""}
                          fill
                          sizes="(min-width: 1024px) 32vw, 90vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-center p-8 sm:p-10">
                      <p className="eyebrow">
                        {product.category} · {product.location}
                      </p>
                      <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#1D1D1F]">{product.name}</h3>
                      <p className="font-poppins mt-2 text-sm font-normal text-ink-muted">{product.tagline}</p>
                      <p className="mt-8 text-sm font-semibold text-[#1D1D1F] group-hover:underline">Explore {product.name} →</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <Link
                href="/products"
                className="group flex min-h-64 flex-col items-start justify-center rounded-2xl border border-dashed border-black/20 p-8 transition hover:border-black/30 sm:p-10"
              >
                <p className="eyebrow">In progress</p>
                <p className="mt-4 max-w-sm leading-7 text-ink-muted">
                  We haven&apos;t shipped a {industry.title.toLowerCase()} case study yet — more work landing here soon.
                </p>
                <p className="mt-6 text-sm font-semibold text-foreground group-hover:underline">See everything we&apos;ve shipped →</p>
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      <WhyUsSection />

      <section className="py-20 sm:py-28">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col items-start gap-4 rounded-[28px] bg-foreground p-10 text-background sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-semibold tracking-tight">Ready to talk about {industry.title.toLowerCase()}?</p>
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
