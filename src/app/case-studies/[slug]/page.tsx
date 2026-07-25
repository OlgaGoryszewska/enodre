import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caseStudies, getCaseStudy } from "@/lib/content";

type CaseStudyPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const study = getCaseStudy((await params).slug);
  return study ? { title: study.title, description: study.summary } : {};
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const study = getCaseStudy((await params).slug);
  if (!study) notFound();

  return (
    <article className="shell py-20 sm:py-28">
      <Link href="/case-studies" className="text-sm font-semibold text-ink-muted hover:text-foreground">← All case studies</Link>
      <p className="eyebrow mt-16">{study.sector}</p>
      <h1 className="page-title mt-6 max-w-5xl">{study.title}</h1>
      <p className="mt-8 max-w-3xl text-xl leading-9 text-ink-muted">{study.summary}</p>
      {study.image && (
        <div className="mx-auto mt-16 max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-card">
          <Image
            src={study.image}
            alt={study.imageAlt ?? ""}
            width={1080}
            height={1080}
            sizes="(min-width: 1024px) 384px, 80vw"
            className="h-auto w-full"
          />
        </div>
      )}
      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 md:grid-cols-2">
        <section className="bg-card p-8 sm:p-10">
          <p className="eyebrow">The challenge</p>
          <p className="mt-6 text-lg leading-8">{study.challenge}</p>
        </section>
        <section className="bg-card p-8 sm:p-10">
          <p className="eyebrow">Our approach</p>
          <p className="mt-6 text-lg leading-8">{study.approach}</p>
        </section>
      </div>
      <div className="mt-6 rounded-2xl bg-foreground p-8 text-background sm:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Result</p>
        <p className="mt-4 text-2xl font-semibold tracking-tight">{study.result}</p>
      </div>
    </article>
  );
}
