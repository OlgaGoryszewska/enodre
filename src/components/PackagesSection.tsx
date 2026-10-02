import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Tier = {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
};

const TIERS_EN: Tier[] = [
  {
    name: "Launch",
    tagline: "Get your business online properly.",
    description: "For businesses that need a modern, high-converting digital presence.",
    features: ["UX/UI design", "Premium responsive website", "CMS", "SEO foundations", "Analytics", "Contact/lead forms", "Performance optimisation"],
    cta: { label: "Build my website", href: "/#get-in-touch" },
  },
  {
    name: "Grow",
    tagline: "Turn manual work into a digital workflow.",
    description: "For businesses losing time to spreadsheets, emails and disconnected tools.",
    features: [
      "Everything in Launch",
      "Business process analysis",
      "Custom dashboard",
      "Workflow automation",
      "API/integration development",
      "Customer/admin portals",
      "Reporting",
    ],
    cta: { label: "Automate my business", href: "/#get-in-touch" },
    highlighted: true,
  },
  {
    name: "Scale",
    tagline: "Build the software your business actually needs.",
    description: "For companies that have outgrown off-the-shelf software.",
    features: [
      "Product strategy",
      "UX/UI",
      "Custom web application",
      "Database & backend",
      "User authentication",
      "Integrations",
      "AI/automation opportunities",
      "Cloud deployment",
      "Ongoing support",
    ],
    cta: { label: "Build my platform", href: "/#get-in-touch" },
  },
];

const TIERS_PL: Tier[] = [
  {
    name: "Launch",
    tagline: "Zaistniej online tak, jak trzeba.",
    description: "Dla firm, które potrzebują nowoczesnej strony budującej zaufanie i konwersje.",
    features: ["Projekt UX/UI", "Responsywna strona premium", "CMS", "Podstawy SEO", "Analityka", "Formularze kontaktowe/leadowe", "Optymalizacja wydajności"],
    cta: { label: "Zbuduj moją stronę", href: "/#get-in-touch" },
  },
  {
    name: "Grow",
    tagline: "Zamień ręczną pracę w cyfrowy workflow.",
    description: "Dla firm tracących czas na arkuszach, mailach i niepołączonych narzędziach.",
    features: [
      "Wszystko z pakietu Launch",
      "Analiza procesów biznesowych",
      "Dedykowany dashboard",
      "Automatyzacja workflow",
      "Integracje i API",
      "Portale klienta/administratora",
      "Raportowanie",
    ],
    cta: { label: "Zautomatyzuj moją firmę", href: "/#get-in-touch" },
    highlighted: true,
  },
  {
    name: "Scale",
    tagline: "Zbuduj oprogramowanie, którego naprawdę potrzebuje Twoja firma.",
    description: "Dla firm, które przerosły gotowe rozwiązania.",
    features: [
      "Strategia produktowa",
      "UX/UI",
      "Dedykowana aplikacja webowa",
      "Baza danych i backend",
      "Uwierzytelnianie użytkowników",
      "Integracje",
      "Możliwości AI/automatyzacji",
      "Wdrożenie w chmurze",
      "Stałe wsparcie",
    ],
    cta: { label: "Zbuduj moją platformę", href: "/#get-in-touch" },
  },
];

const TIERS_NO: Tier[] = [
  {
    name: "Launch",
    tagline: "Kom skikkelig på nett.",
    description: "For bedrifter som trenger en moderne, konverterende digital tilstedeværelse.",
    features: ["UX/UI-design", "Premium responsiv nettside", "CMS", "SEO-grunnmur", "Analyse", "Kontakt-/leadskjemaer", "Ytelsesoptimalisering"],
    cta: { label: "Bygg nettsiden min", href: "/#get-in-touch" },
  },
  {
    name: "Grow",
    tagline: "Gjør manuelt arbeid til en digital arbeidsflyt.",
    description: "For bedrifter som taper tid på regneark, e-post og usammenhengende verktøy.",
    features: [
      "Alt i Launch",
      "Analyse av forretningsprosesser",
      "Skreddersydd dashbord",
      "Automatisering av arbeidsflyt",
      "API-/integrasjonsutvikling",
      "Kunde-/adminportaler",
      "Rapportering",
    ],
    cta: { label: "Automatiser bedriften min", href: "/#get-in-touch" },
    highlighted: true,
  },
  {
    name: "Scale",
    tagline: "Bygg programvaren bedriften din faktisk trenger.",
    description: "For selskaper som har vokst fra hyllevare-programvare.",
    features: [
      "Produktstrategi",
      "UX/UI",
      "Skreddersydd webapplikasjon",
      "Database og backend",
      "Brukerautentisering",
      "Integrasjoner",
      "AI-/automatiseringsmuligheter",
      "Skydistribusjon",
      "Løpende support",
    ],
    cta: { label: "Bygg plattformen min", href: "/#get-in-touch" },
  },
];

export function PackagesSection({ locale = "en" }: { locale?: "en" | "pl" | "no" }) {
  const TIERS = locale === "pl" ? TIERS_PL : locale === "no" ? TIERS_NO : TIERS_EN;

  return (
    <section className="border-y border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="eyebrow">{locale === "pl" ? "Pakiety" : locale === "no" ? "Pakker" : "Packages"}</p>
          <p className="font-funnel-display mt-4 max-w-2xl text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            {locale === "pl"
              ? "Twoja firma rośnie. Twoja technologia powinna rosnąć razem z nią."
              : locale === "no"
                ? "Bedriften din vokser. Teknologien bør vokse med den."
                : "Your business is growing. Your technology should grow with it."}
          </p>
          <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
            {"Launch → Grow → Scale — "}
            {locale === "pl"
              ? "od strony, która sprzedaje, po kompletną platformę biznesową, Enodre buduje rozwiązania dopasowane do tego, jak działa Twoja firma."
              : locale === "no"
                ? "fra en nettside som presterer til en komplett forretningsplattform — Enodre bygger digitale løsninger rundt måten bedriften din jobber på."
                : "from a high-performing website to a complete business platform, Enodre builds digital solutions around the way your business works."}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier, index) => (
            <Reveal key={tier.name} delay={index * 0.08}>
              <div
                className={`flex h-full flex-col rounded-[28px] p-8 shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] ${
                  tier.highlighted ? "bg-foreground text-background ring-2 ring-accent" : "bg-background text-foreground"
                }`}
              >
                {tier.highlighted && (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-background">
                    {locale === "pl" ? "Najpopularniejszy" : locale === "no" ? "Mest populær" : "Most popular"}
                  </span>
                )}
                <p className="font-funnel-display text-2xl font-normal tracking-tight">{tier.name}</p>
                <p className={`mt-2 text-sm font-semibold ${tier.highlighted ? "text-background" : "text-foreground"}`}>{tier.tagline}</p>
                <p className={`font-poppins mt-2 text-sm leading-6 ${tier.highlighted ? "text-background/70" : "text-ink-muted"}`}>
                  {tier.description}
                </p>

                <ul className="mt-6 grid flex-1 gap-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-none ${tier.highlighted ? "text-accent" : "text-accent"}`}
                        aria-hidden="true"
                      />
                      <span className={tier.highlighted ? "text-background/90" : "text-ink-muted"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-8 text-lg font-semibold">
                  {locale === "pl" ? "Bezpłatna konsultacja" : locale === "no" ? "Få gratis konsultasjon" : "Get free consultation"}
                </p>

                <Link
                  href={tier.cta.href}
                  className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 ${
                    tier.highlighted ? "bg-background text-foreground" : "bg-foreground text-background"
                  }`}
                >
                  <span>{tier.cta.label}</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
