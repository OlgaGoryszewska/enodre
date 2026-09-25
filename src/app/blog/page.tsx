import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@/lib/blog";
import { BlogCover } from "@/components/blog/BlogCover";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Blog",
  description: "Research-backed writing on software quality, AI-assisted development, and what it actually takes to ship maintainable code.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | Enodre",
    description: "Research-backed writing on software quality, AI-assisted development, and what it actually takes to ship maintainable code.",
    url: "/blog",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogIndexPage() {
  return (
    <section className="shell py-20 sm:py-28">
      <p className="eyebrow">Blog</p>
      <h1 className="page-title mt-6 max-w-3xl">Notes on software quality, from the engineers building it.</h1>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {blogPosts.map((post, index) => (
          <Reveal key={post.slug} delay={index * 0.06}>
            <Link
              href={`/blog/${post.slug}`}
              className="flex h-full flex-col overflow-hidden rounded-[24px] bg-background shadow-[0_24px_48px_-20px_rgba(30,30,60,0.35)] transition-all duration-200 ease-out hover:-translate-y-1"
            >
              <BlogCover post={post} className="aspect-[16/9] w-full flex-none" />
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9EA5C3]">{post.category}</p>
                <h2 className="mt-3 text-[22px] font-semibold leading-tight tracking-tighter text-[#1D1D1F]">{post.title}</h2>
                <p className="font-poppins mt-2 flex-1 text-sm leading-6 text-ink-muted">{post.description}</p>

                <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-5">
                  {post.author.image && (
                    <Image
                      src={post.author.image}
                      alt={post.author.imageAlt ?? post.author.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <div className="text-xs text-ink-muted">
                    <span className="font-semibold text-foreground">{post.author.name}</span>
                    {" · "}
                    {formatDate(post.publishedAt)}
                    {" · "}
                    {post.readTime}
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
