import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Products we delivered",
  description: "Software we've taken from idea to production for our clients.",
};

export default function ProductsPage() {
  return (
    <section className="shell py-20 sm:py-28">
      <p className="eyebrow">Products we delivered</p>
      <h1 className="page-title mt-6 max-w-4xl">Software we&apos;ve taken from idea to production.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
        A look at what we&apos;ve actually shipped — not mockups, working products in the hands of real teams.
      </p>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {products.map((product, index) => (
          <Reveal key={product.slug} delay={index * 0.08}>
            <Link
              href={`/products/${product.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-card transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {product.image && (
                <div className="overflow-hidden border-b border-black/10 bg-background">
                  <Image
                    src={product.image}
                    alt={product.imageAlt ?? ""}
                    width={1080}
                    height={1080}
                    sizes="(min-width: 768px) 40vw, 90vw"
                    className="h-auto w-full"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-8 sm:p-10">
                <p className="eyebrow">{product.category}</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{product.name}</h2>
                <p className="mt-2 text-lg font-medium text-ink-muted">{product.tagline}</p>
                <p className="mt-4 leading-7 text-ink-muted">{product.description}</p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {product.stack.map((item) => (
                    <span key={item} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-ink-muted">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-foreground p-5 text-background">
                  <p className="font-mono text-xs uppercase tracking-widest text-accent">Outcome</p>
                  <p className="mt-2 text-sm leading-6">{product.outcome}</p>
                </div>

                <p className="mt-auto pt-8 text-sm font-semibold group-hover:underline">Explore {product.name} →</p>
              </div>
            </Link>
          </Reveal>
        ))}

        <Reveal delay={products.length * 0.08}>
          <div className="flex h-full min-h-80 flex-col items-start justify-center rounded-2xl border border-dashed border-black/20 p-8 sm:p-10">
            <p className="eyebrow">In progress</p>
            <p className="mt-4 max-w-sm leading-7 text-ink-muted">
              More shipped products landing here soon.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
