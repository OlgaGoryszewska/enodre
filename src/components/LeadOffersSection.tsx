import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const LEAD_OFFERS_EN = [
  {
    image: "/ai-image.png",
    imageAlt: "A robotic hand touching a laptop keyboard, representing AI handling data entry and processing.",
    color: "#3661C4",
    eyebrow: "Lead offer 01",
    title: "AI-powered field-to-office systems",
    description:
      "Replace paper, spreadsheets, and group chats with one connected system — AI handles the extraction, checks, and reporting, so nothing gets re-typed by hand.",
    bullets: [
      "Field data captured once, verified automatically",
      "AI extracts and checks it instead of your team re-typing it",
      "Reports that used to take hours are ready in seconds",
    ],
    proof: "FuelFlo — built exactly this for temporary power & fuel operations",
    proofHref: "/products/fuelflo",
    pricing: "Build fee, then an ongoing retainer",
    cta: { label: "See how FuelFlo works", href: "/products/fuelflo" },
  },
  {
    image: "/audit-img.png",
    imageAlt: "Two engineers reviewing a code audit dashboard on a monitor, flagging critical, high, medium, and low severity issues.",
    color: "#B0512E",
    eyebrow: "Lead offer 02",
    title: "AI-code audit & rescue",
    description:
      "A fixed-price audit for founders and companies whose AI-built product now has real users — security review, hardening, and a clear plan for what to fix first.",
    bullets: [
      "Security and architecture review of what's actually shipped",
      "A hardening pass on what's genuinely at risk",
      "A fixed-price plan for remediation, in priority order",
    ],
    proof: "Backed by a security background from Splunk, and our own research on AI-code risk",
    proofHref: "/blog/vibe-coded-mvp-real-users",
    pricing: "Fixed-price audit, then paid remediation",
    cta: { label: "Read what breaks first", href: "/blog/vibe-coded-mvp-real-users" },
  },
];

const LEAD_OFFERS_PL = [
  {
    image: "/ai-image.png",
    imageAlt: "Robotyczna dłoń dotykająca klawiatury laptopa — symbol AI obsługującego wprowadzanie i przetwarzanie danych.",
    color: "#3661C4",
    eyebrow: "Oferta wiodąca 01",
    title: "Systemy pracy oparte na AI — od terenu do biura",
    description:
      "Zastępujemy papier, arkusze kalkulacyjne i grupowe czaty jednym połączonym systemem — AI zajmuje się ekstrakcją danych, weryfikacją i raportowaniem, więc nic nie trzeba przepisywać ręcznie.",
    bullets: [
      "Dane z terenu wprowadzane raz, automatycznie weryfikowane",
      "AI wyodrębnia i sprawdza dane zamiast Twojego zespołu",
      "Raporty, które kiedyś zajmowały godziny, gotowe w kilka sekund",
    ],
    proof: "FuelFlo — zbudowaliśmy dokładnie taki system dla firm z branży zasilania tymczasowego i paliw",
    proofHref: "/products/fuelflo",
    pricing: "Opłata za wdrożenie, a potem stały abonament",
    cta: { label: "Zobacz, jak działa FuelFlo", href: "/products/fuelflo" },
  },
  {
    image: "/audit-img.png",
    imageAlt: "Dwoje inżynierów analizujących pulpit audytu kodu na monitorze, z oznaczonymi problemami o priorytecie krytycznym, wysokim, średnim i niskim.",
    color: "#B0512E",
    eyebrow: "Oferta wiodąca 02",
    title: "Audyt i ratowanie kodu AI",
    description:
      "Audyt w stałej cenie dla founderów i firm, których produkt zbudowany z pomocą AI ma już realnych użytkowników — przegląd bezpieczeństwa, wzmocnienie kodu i jasny plan, co naprawić najpierw.",
    bullets: [
      "Przegląd bezpieczeństwa i architektury tego, co faktycznie trafiło na produkcję",
      "Wzmocnienie kodu w miejscach, które naprawdę stanowią ryzyko",
      "Plan naprawy w stałej cenie, uszeregowany według priorytetów",
    ],
    proof: "Poparte doświadczeniem w bezpieczeństwie ze Splunk oraz naszymi własnymi badaniami nad ryzykiem kodu generowanego przez AI",
    proofHref: "/blog/vibe-coded-mvp-real-users",
    pricing: "Audyt w stałej cenie, a potem płatna naprawa",
    cta: { label: "Przeczytaj, co pęka najpierw", href: "/blog/vibe-coded-mvp-real-users" },
  },
];

export function LeadOffersSection({ locale = "en" }: { locale?: "en" | "pl" }) {
  const LEAD_OFFERS = locale === "pl" ? LEAD_OFFERS_PL : LEAD_OFFERS_EN;

  return (
    <section className="py-20 sm:py-28">
      <div className="shell">
        <p className="eyebrow">{locale === "pl" ? "Czym się zajmujemy" : "What we do"}</p>
        <p className="font-funnel-display mt-4 max-w-2xl text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          {locale === "pl" ? "Dwie rzeczy, na których się skupiamy." : "Two things we focus on."}
        </p>
        <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
          {locale === "pl" ? "Wszystko inne, co budujemy, wpisuje się w jedną z tych ofert." : "Everything else we build feeds into one of these."}
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {LEAD_OFFERS.map((offer) => {
            return (
              <div
                key={offer.title}
                className="flex h-full flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)]"
              >
                <div className="relative aspect-[16/9] w-full flex-none">
                  <Image
                    src={offer.image}
                    alt={offer.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-8 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: offer.color }}>
                  {offer.eyebrow}
                </p>
                <h3 className="font-funnel-display mt-2 text-2xl font-normal tracking-tight text-foreground">
                  {offer.title}
                </h3>
                <p className="font-poppins mt-4 text-sm leading-6 text-ink-muted">{offer.description}</p>

                <ul className="mt-6 grid gap-2.5">
                  {offer.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <Check className="mt-0.5 h-4 w-4 flex-none" style={{ color: offer.color }} aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-t border-black/10 pt-6">
                  <p className="text-xs font-semibold text-foreground">{offer.pricing}</p>
                  <Link
                    href={offer.proofHref}
                    className="font-poppins mt-2 block text-xs text-ink-muted underline underline-offset-2 hover:text-foreground"
                  >
                    {offer.proof}
                  </Link>
                </div>

                <Link
                  href={offer.cta.href}
                  className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  <span>{offer.cta.label}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
