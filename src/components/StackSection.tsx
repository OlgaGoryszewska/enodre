import type { StackGroup } from "@/lib/content";

interface StackSectionProps {
  groups: StackGroup[];
}

export function StackSection({ groups }: StackSectionProps) {
  return (
    <section className="shell py-20 sm:py-28">
      <div className="text-center">
        <p className="eyebrow">Tools & stack</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {groups[0]?.heading}
        </h2>
      </div>

      <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
        {groups[0]?.items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted"
          >
            {item}
          </span>
        ))}
      </div>

      {groups.slice(1).map((group) => (
        <div key={group.heading} className="mt-16 text-center">
          <h3 className="text-xl font-semibold tracking-tight">{group.heading}</h3>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {group.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
