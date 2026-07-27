import Link from "next/link";
import { caseStudies, services, stackGroups, teamMembers } from "@/lib/content";
import { ChallengeSection } from "@/components/challenge/ChallengeSection";
import { TeamSection } from "@/components/TeamSection";
import { StackSection } from "@/components/StackSection";

export default function Home() {
  return (
    <>
      <section className="shell py-20 sm:py-28 lg:py-36">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-16">
          <div>
            <p className="eyebrow mb-8">Digital product studio</p>
            <h1 className="display-title">
              We organize what&apos;s holding your business back.
            </h1>
            <video
              src="/video-hero.mp4"
              poster="/hero-img.png"
              aria-hidden="true"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="-mx-4 h-auto w-[calc(100%+2rem)] max-w-none pt-20 sm:mx-0 sm:w-full sm:max-w-full"
            />
            <p className="mt-10 max-w-2xl text-lg leading-8 text-ink-muted sm:text-xl">
              We design and build digital solutions — workflows that turn paper trails and spreadsheets into clear, working systems, native applications tailored to your business, dashboards that organize complexity, and websites that increase sales and visibility.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              
              <Link className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-m font-semibold text-background" href="/services">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-background" />
                <span>Explore our services</span>
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-full border border-black/20 px-6 py-3 text-m font-semibold" href="/case-studies">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" />
                <span>See our work</span>
              </Link>
            </div>
          </div>
       
        </div>
      </section>

      <section className="border-y border-black/10 bg-card py-20">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">What we do</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">From first conversation to working software.</h2>
            <p className="mt-6 leading-7 text-ink-muted">
              Custom dashboards, web pages, AI connections, native apps, CMS builds — whatever the tangle looks like, we like a challenge.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {["Dashboards", "Web pages", "AI connections", "Native apps", "CMS"].map((item) => (
                <li key={item} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-ink-muted">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2">
            {services.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group bg-card p-7 transition hover:bg-white">
                <p className="font-mono text-xs text-accent">{service.number}</p>
                <h3 className="mt-8 text-xl font-semibold tracking-tight">{service.title}</h3>
                <p className="mt-3 leading-7 text-ink-muted">{service.summary}</p>
                <span className="mt-7 inline-block text-sm font-semibold group-hover:underline">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-20 sm:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Systems that make work flow.</h2>
          </div>
          <Link className="hidden text-sm font-semibold sm:block" href="/case-studies">All case studies →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {caseStudies.map((study) => (
            <Link key={study.slug} href={`/case-studies/${study.slug}`} className="group rounded-2xl border border-black/10 bg-card p-8 sm:p-10">
              <p className="eyebrow">{study.sector}</p>
              <h3 className="mt-16 text-3xl font-semibold tracking-[-0.04em]">{study.title}</h3>
              <p className="mt-3 leading-7 text-ink-muted">{study.summary}</p>
              <p className="mt-8 font-mono text-sm text-accent">{study.result}</p>
            </Link>
          ))}
        </div>
      </section>
         <TeamSection members={teamMembers} ctaHref="#get-in-touch" />

      <StackSection groups={stackGroups} />

      <ChallengeSection />
    </>
  );
}
