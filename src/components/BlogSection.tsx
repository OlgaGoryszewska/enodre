import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@/lib/blog";
import { BlogCoverArt } from "@/components/blog/BlogCoverArt";
import { Reveal } from "@/components/motion/Reveal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogSection() {
  const posts = blogPosts.slice(0, 3);

  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">From the blog</p>
              <p className="font-funnel-display mt-4 text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
                Notes on software quality
              </p>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-ink-muted">
              View all articles →
            </Link>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <Reveal key={post.slug} delay={index * 0.06}>
              <Link
                href={`/blog/${post.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-[24px] bg-card shadow-[0_24px_48px_-20px_rgba(30,30,60,0.35)] transition-all duration-200 ease-out hover:-translate-y-1"
              >
                <BlogCoverArt variant={post.coverVariant} className="aspect-[16/9] w-full flex-none" />
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#9EA5C3]">{post.category}</p>
                  <h3 className="mt-3 text-lg font-semibold leading-tight tracking-tighter text-[#1D1D1F]">{post.title}</h3>
                  <p className="font-poppins mt-2 flex-1 text-sm leading-6 text-ink-muted">{post.description}</p>

                  <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-5">
                    {post.author.image && (
                      <Image
                        src={post.author.image}
                        alt={post.author.imageAlt ?? post.author.name}
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    )}
                    <div className="text-xs text-ink-muted">
                      <span className="font-semibold text-foreground">{post.author.name}</span>
                      {" · "}
                      {formatDate(post.publishedAt)}
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
