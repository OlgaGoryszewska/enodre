import Link from "next/link";
import type { TeamMember } from "@/lib/content";

interface TeamSectionProps {
  members: TeamMember[];
  ctaHref: string;
}

export function TeamSection({ members, ctaHref }: TeamSectionProps) {
  return (
    <section className="border-y border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <div className="text-center">
          <p className="eyebrow">The team</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Meet the people behind Enodre.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-3">
          {members.map((member) => (
            <div key={member.name} className="flex flex-col items-center bg-card p-8 text-center sm:p-10">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent"
              >
                {member.name.charAt(0)}
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{member.name}</h3>
              <p className="mt-2 leading-7 text-ink-muted">{member.role}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background"
            href={ctaHref}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
            <span>Send us a message</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
