import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { expertiseAreas } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Services",
  description: "Full-cycle development teams ready to turn your vision into a working, scalable product.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services | Enodre",
    description: "Full-cycle development teams ready to turn your vision into a working, scalable product.",
    url: "/services",
  },
};

const CATEGORIES = Array.from(new Set(expertiseAreas.map((area) => area.category)));

export default function ServicesPage() {
  return (
    <section className="shell py-20 sm:py-28">
      <p className="eyebrow">Services</p>
      <h1 className="page-title mt-6 max-w-4xl">Full-cycle development teams ready to turn your vision into a working, scalable product.</h1>

      <div className="mt-16">
        {CATEGORIES.map((category, categoryIndex) => (
          <div key={category} className={categoryIndex > 0 ? "mt-12" : undefined}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9EA5C3]">{category}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {expertiseAreas
                .filter((area) => area.category === category)
                .map((area, index) => (
                  <Reveal key={area.slug} delay={index * 0.05}>
                    <Link
                      href={`/services/${area.slug}`}
                      className="relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-[24px] bg-background shadow-[0_24px_48px_-20px_rgba(30,30,60,0.35)] transition-all duration-200 ease-out hover:-translate-y-1"
                    >
                      <div className="relative h-[170px] w-full flex-none">
                        <Image
                          src={area.image}
                          alt={`${area.title} preview`}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 p-6">
                        <h2 className="text-[22px] font-semibold leading-tight tracking-tighter text-[#1D1D1F]">{area.title}</h2>
                        <p className="font-poppins mt-2 text-sm leading-6 text-ink-muted">{area.description}</p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
