import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/lib/blog";
import { getExpertiseArea } from "@/lib/content";
import { BlogCoverArt } from "@/components/blog/BlogCoverArt";
import { BlogBody } from "@/components/blog/BlogBody";
import { Reveal } from "@/components/motion/Reveal";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();

  const relatedServices = post.relatedServiceSlugs
    .map((slug) => getExpertiseArea(slug))
    .filter((area): area is NonNullable<typeof area> => Boolean(area));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: "Enodre", url: "https://enodre.com" },
    mainEntityOfPage: `https://enodre.com/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <article className="shell py-20 sm:py-28">
        <Link href="/blog" className="text-sm font-semibold text-ink-muted hover:text-foreground">
          ← All articles
        </Link>

        <Reveal>
          <p className="eyebrow mt-8">{post.category}</p>
          <h1 className="font-funnel-display mt-4 max-w-3xl text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-8 flex items-center gap-3">
            {post.author.image && (
              <Image
                src={post.author.image}
                alt={post.author.imageAlt ?? post.author.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
            )}
            <div className="text-sm">
              <p className="font-semibold text-foreground">{post.author.name}</p>
              <p className="text-ink-muted">
                {formatDate(post.publishedAt)} · {post.readTime}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <BlogCoverArt variant={post.coverVariant} className="mt-12 aspect-[21/9] w-full rounded-[28px]" />
        </Reveal>

        <div className="mt-12 max-w-2xl">
          <BlogBody blocks={post.body} />
        </div>

        <Reveal>
          <div className="mt-14 max-w-2xl rounded-[24px] border border-black/10 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9EA5C3]">Sources</p>
            <ul className="mt-4 grid gap-3">
              {post.sources.map((source) => (
                <li key={source.url} className="text-sm leading-6">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-ink-muted"
                  >
                    {source.label}
                  </a>
                  <span className="text-ink-muted"> — {source.publisher}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {relatedServices.length > 0 && (
          <Reveal>
            <div className="mt-14">
              <p className="text-sm font-semibold text-ink-muted">Related services</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {relatedServices.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-black/20"
                  >
                    <span>{service.title}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="mt-14 flex flex-col items-start gap-4 rounded-[28px] bg-foreground p-10 text-background sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-semibold tracking-tight">Dealing with this on your own codebase?</p>
              <p className="font-poppins mt-2 text-sm text-background/70">Book a short call and we&apos;ll talk through what an audit would actually find.</p>
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
      </article>
    </>
  );
}
