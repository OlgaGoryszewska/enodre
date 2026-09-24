import type { BlogContentBlock } from "@/lib/blog";
import { Reveal } from "@/components/motion/Reveal";

const STAT_COLOR = "#D64545";

export function BlogBody({ blocks }: { blocks: BlogContentBlock[] }) {
  return (
    <div className="grid gap-6">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <Reveal key={index}>
              <h2 className="font-funnel-display mt-6 text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
                {block.text}
              </h2>
            </Reveal>
          );
        }

        if (block.type === "paragraph") {
          return (
            <Reveal key={index}>
              <p className="font-poppins text-base leading-7 text-ink-muted">{block.text}</p>
            </Reveal>
          );
        }

        if (block.type === "list") {
          return (
            <Reveal key={index}>
              <ul className="grid gap-3">
                {block.items.map((item) => (
                  <li key={item} className="font-poppins flex gap-3 text-base leading-7 text-ink-muted">
                    <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-foreground/40" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        }

        if (block.type === "quote") {
          return (
            <Reveal key={index}>
              <blockquote className="border-l-2 border-foreground/20 py-1 pl-6">
                <p className="font-funnel-display text-xl leading-8 text-foreground italic">“{block.text}”</p>
                <cite className="font-poppins mt-3 block text-sm not-italic text-ink-muted">— {block.attribution}</cite>
              </blockquote>
            </Reveal>
          );
        }

        if (block.type === "stats") {
          return (
            <Reveal key={index}>
              <div className="my-2 grid gap-4 sm:grid-cols-3">
                {block.items.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] bg-card p-6 shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)]"
                  >
                    <p className="font-urbanist text-3xl font-bold" style={{ color: STAT_COLOR }}>
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{stat.label}</p>
                    <p className="font-poppins mt-2 text-xs leading-5 text-ink-muted">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          );
        }

        return null;
      })}
    </div>
  );
}
