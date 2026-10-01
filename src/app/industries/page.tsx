import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { industries } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Industries",
  description: "Software built for the industries that run on operational complexity.",
  alternates: { canonical: "/industries" },
  openGraph: {
    title: "Industries | Enodre",
    description: "Software built for the industries that run on operational complexity.",
    url: "/industries",
  },
};

export default function IndustriesPage() {
  return (
    <section className="shell py-20 sm:py-28">
      <p className="eyebrow">Industries</p>
      <h1 className="page-title mt-6 max-w-4xl">Built for the industries that run on operational complexity.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
        Every industry has its own workflows and edge cases. Here&apos;s what we build for each.
      </p>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {industries.map((industry, index) => (
          <Reveal key={industry.slug} delay={index * 0.06}>
            <Link
              href={`/industries/${industry.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-card transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {industry.image && (
                <div className="relative h-32 w-full">
                  <Image
                    src={industry.image}
                    alt={`${industry.title} industry`}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-base font-semibold tracking-tight">{industry.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{industry.description}</p>
                <p className="mt-4 text-sm font-semibold text-foreground group-hover:underline">Explore →</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
