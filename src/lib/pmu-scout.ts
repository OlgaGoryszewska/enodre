// The PMU agent's daily search: which ads are PMU work, and which newly found
// places are worth your time. Pure, so it's unit-tested; pmu-agent-run.ts does
// the fetching.

// A real PMU ad names the technique. "Makeup" or "permanent" alone is noise
// (Sephora, bridal makeup, "permanent contract").
const STRONG =
  /(micro[- ]?blad|microshad|nano[- ]?brow|powder brows?|ombr[eé] brows?|combi brows?|lip blush|lip tattoo|powder lips|eyeliner tattoo|\bs?pmu\b|semi[- ]?perman|permanent make[- ]?up|permanant make[- ]?up|perma(nent)?[- ]?makeup|micropigment|mikropigment|dermopigment|\bsmp\b|scalp micro|areola|paramedical tattoo|medical tattoo|cosmetic tattoo|linergist|makijaż permanentny|makijaz permanentny|maquillaje permanente|micropigmentad|kosmetisk tatover|mikroblading|phibrows)/i;
// Roles that look close but aren't ours, unless the ad also names a PMU technique.
const NOT_OURS =
  /(nail tech|manicur|pedicur|hair ?dress|hair stylist|barber|receptionist|resepsjonist|front desk|sales (associate|assistant)|beauty advisor|beauty consultant|retail|sephora|bridal makeup|wizaż|wizaz|lash extension|eyelash extension)/i;
// Never: fees, unpaid work, or ads that only want local or one nationality.
const RED_FLAG =
  /(visit visa|tourist visa|own visa|husband'?s (visa|sponsorship)|freelance visa (required|needed)|commission only|commission-only|unpaid trial|pay (a|the) fee|registration fee|training fee|deposit required|\bnationals only\b)/i;
const BOOST =
  /(medical|clinic|areola|scalp|smp|trainer|educator|senior|master|phibrows|relocation|visa provided|accommodation|housing)/i;

export type AdVerdict = { score: number; matched: string[]; redFlags: string[]; keep: boolean };

/** Whether an ad is PMU work, and how good: 0–100, with the words it matched and any red flags. */
export function scorePmuAd(title: string, text: string): AdVerdict {
  const all = `${title} ${text}`;
  const matched = [...new Set((all.match(new RegExp(STRONG.source, "gi")) ?? []).map((word) => word.toLowerCase()))];
  const redFlags = [...new Set((all.match(new RegExp(RED_FLAG.source, "gi")) ?? []).map((word) => word.toLowerCase()))];
  if (matched.length === 0) return { score: 0, matched, redFlags, keep: false };
  const titleStrong = STRONG.test(title);
  if (!titleStrong && NOT_OURS.test(title)) return { score: 0, matched, redFlags, keep: false };
  const boosts = new Set((all.match(new RegExp(BOOST.source, "gi")) ?? []).map((word) => word.toLowerCase())).size;
  const score = Math.max(
    0,
    Math.min(100, (titleStrong ? 50 : 30) + matched.length * 8 + boosts * 6 - redFlags.length * 40)
  );
  return { score, matched, redFlags, keep: redFlags.length === 0 };
}

export function mentionsPmu(text: string) {
  return STRONG.test(text);
}

// --- Alert emails ---------------------------------------------------------

export type AlertLink = { title: string; url: string };

const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

/**
 * Job links in an alert email from any board: every link whose text names a
 * PMU technique. Works across LinkedIn, Indeed, InfoJobs, Net-Empregos, FINN …
 * without a parser per board.
 */
export function extractAlertLinks(html: string): AlertLink[] {
  const links = new Map<string, AlertLink>();
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = decode(match[1]);
    const title = decode(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (!/^https?:\/\//.test(url) || title.length < 6 || title.length > 160) continue;
    if (!STRONG.test(title)) continue;
    if (!links.has(title.toLowerCase())) links.set(title.toLowerCase(), { title, url });
  }
  return [...links.values()];
}

// --- Fresha: places offering PMU ------------------------------------------

export type ScoutCity = { slug: string; city: string; country: string; currency: string; market: number };

// Fresha's PMU pages per city, with a market score for pay (1–5) from the research.
export const SCOUT_CITIES: ScoutCity[] = [
  { slug: "es-marbella", city: "Marbella", country: "Spain", currency: "EUR", market: 3 },
  { slug: "es-palma-de-mallorca", city: "Palma de Mallorca", country: "Spain", currency: "EUR", market: 3 },
  { slug: "es-madrid", city: "Madrid", country: "Spain", currency: "EUR", market: 3 },
  { slug: "es-barcelona", city: "Barcelona", country: "Spain", currency: "EUR", market: 3 },
  { slug: "es-malaga", city: "Málaga", country: "Spain", currency: "EUR", market: 2 },
  { slug: "es-valencia", city: "Valencia", country: "Spain", currency: "EUR", market: 2 },
  { slug: "es-alicante", city: "Alicante", country: "Spain", currency: "EUR", market: 2 },
  { slug: "pt-lisbon", city: "Lisbon", country: "Portugal", currency: "EUR", market: 2 },
  { slug: "pt-porto", city: "Porto", country: "Portugal", currency: "EUR", market: 2 },
  { slug: "pt-faro", city: "Faro (Algarve)", country: "Portugal", currency: "EUR", market: 2 },
];
export const SCOUT_TREATMENTS = ["permanent-makeup-tattooing", "microblading"];

export type FreshaVenue = {
  url: string;
  name: string;
  street: string | null;
  website: string | null;
  instagram: string | null;
  rating: number | null;
  reviews: number;
};

type LdNode = Record<string, unknown>;

function ldNodes(html: string): LdNode[] {
  const nodes: LdNode[] = [];
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]) as LdNode | LdNode[];
      const list = Array.isArray(data) ? data : Array.isArray(data["@graph"]) ? (data["@graph"] as LdNode[]) : [data];
      nodes.push(...list);
    } catch {
      // A broken block among several: skip it.
    }
  }
  return nodes;
}

const isBusiness = (node: LdNode) => {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((value) => value === "BeautySalon" || value === "HealthAndBeautyBusiness");
};

function socials(node: LdNode) {
  const same = Array.isArray(node.sameAs) ? (node.sameAs as string[]) : [];
  const instagram = same.find((url) => /instagram\.com\//.test(url)) ?? null;
  const website = same.find((url) => !/(instagram|facebook|google|tiktok|wa\.me|whatsapp)\./.test(url)) ?? null;
  return {
    instagram: instagram ? (instagram.match(/instagram\.com\/([^/?#]+)/)?.[1] ?? null) : null,
    website,
  };
}

/** The places on a Fresha city page for PMU. */
export function parseFreshaListing(html: string): FreshaVenue[] {
  return ldNodes(html)
    .filter(isBusiness)
    .map((node) => {
      const rating = (node.aggregateRating ?? {}) as {
        ratingValue?: number;
        ratingCount?: number;
        reviewCount?: number;
      };
      const address = (node.address ?? {}) as { streetAddress?: string };
      return {
        url: String(node.url ?? "").replace(/#.*$/, ""),
        name: String(node.name ?? "").trim(),
        street: address.streetAddress ?? null,
        ...socials(node),
        rating: rating.ratingValue ?? null,
        reviews: rating.ratingCount ?? rating.reviewCount ?? 0,
      };
    })
    .filter((venue) => venue.url && venue.name);
}

export type FreshaDetails = {
  phone: string | null;
  teamSize: number | null;
  pmuArtists: number;
  /** The highest price of a PMU treatment on the menu, in the local currency. */
  pmuPrice: number | null;
  pmuServices: string[];
};

/** Phone, team, PMU staff and PMU prices from a venue's own Fresha page. */
export function parseFreshaVenue(html: string): FreshaDetails {
  const node = ldNodes(html).find(isBusiness) ?? {};
  const description = String(node.description ?? "");
  const team = description.match(/team of (\d+)\+? practitioners/i);
  const employees = Array.isArray(node.employee) ? (node.employee as { jobTitle?: string }[]) : [];
  const pmuArtists = employees.filter(
    (person) => STRONG.test(person.jobTitle ?? "") || /brow/i.test(person.jobTitle ?? "")
  ).length;
  const services: { name: string; price: number | null }[] = [];
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walk);
    const item = value as Record<string, unknown>;
    const type = String(item["@type"] ?? "");
    if (type === "Offer" || type === "AggregateOffer") {
      // Fresha: the service under itemOffered, its menu section as category, the price on the offer.
      const offered = (item.itemOffered ?? {}) as { name?: string };
      const name = offered.name ?? (typeof item.name === "string" ? item.name : "");
      const category = typeof item.category === "string" ? item.category : "";
      const price = Number(item.highPrice ?? item.price ?? item.lowPrice);
      if (STRONG.test(name) || STRONG.test(category)) {
        services.push({
          name: (STRONG.test(name) ? name : category).trim(),
          price: Number.isFinite(price) && price > 0 ? price : null,
        });
      }
      return;
    }
    for (const child of Object.values(item)) walk(child);
  };
  walk(node.hasOfferCatalog);
  const prices = services.map((service) => service.price).filter((price): price is number => price !== null);
  return {
    phone: typeof node.telephone === "string" ? node.telephone : null,
    teamSize: team ? Number(team[1]) : employees.length || null,
    pmuArtists,
    pmuPrice: prices.length ? Math.max(...prices) : null,
    pmuServices: [...new Set(services.map((service) => service.name))].slice(0, 6),
  };
}

const NAIL_OR_HAIR =
  /(nail|esmalt|manicur|uñas|unhas|peluquer|cabeleireir|hair (salon|studio)|barber|barbear|barbería|barberia)/i;
const MEDICAL = /(clinic|klinik|medical|medic|derma|aesthetic|esthetic|surgery|cosmetic center|hospital|doctor|dr\.)/i;
const STUDIO = /(brow|pmu|ink|micro|lash|permanent|beauty bar|studio)/i;

export function placeKind(name: string): "clinic" | "studio" | "salon" {
  if (MEDICAL.test(name)) return "clinic";
  if (STUDIO.test(name)) return "studio";
  return "salon";
}

// Mobile numbers, so WhatsApp works: Spain 6/7, Portugal 9, Norway 4/9, UK 07.
export function whatsappNumber(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (/^(34[67]\d{8}|3519\d{8}|47[49]\d{7}|447\d{9})$/.test(digits)) return `+${digits}`;
  return null;
}

// Premium PMU price, by currency (roughly the top third of each market).
const PREMIUM: Record<string, number> = { GBP: 400, EUR: 350 };

/**
 * How valuable a place is likely to be, 1–5: the market's pay, then a busy
 * team, premium prices, a medical setting, and a gap in PMU staff.
 */
export function placeValue(city: ScoutCity, venue: FreshaVenue, details: FreshaDetails | null) {
  let score = city.market;
  const reasons: string[] = [];
  if (MEDICAL.test(venue.name)) {
    score += 1;
    reasons.push("medical setting");
  }
  if (details?.pmuPrice && details.pmuPrice >= (PREMIUM[city.currency] ?? Infinity)) {
    score += 1;
    reasons.push(`premium PMU (${city.currency} ${details.pmuPrice})`);
  }
  if ((details?.teamSize ?? 0) >= 10 || venue.reviews >= 500) {
    score += 1;
    reasons.push(details?.teamSize ? `team of ${details.teamSize}` : `${venue.reviews} reviews`);
  }
  if (details && details.pmuServices.length > 0 && details.pmuArtists === 0) {
    reasons.push("offers PMU without a dedicated PMU artist listed");
  }
  if (details && details.pmuServices.length === 0) {
    reasons.push("PMU isn't on its online menu yet: pitch launching it");
  }
  // Nail bars and hair salons rarely hire a senior PMU artist.
  if (NAIL_OR_HAIR.test(venue.name)) {
    score -= 1;
    reasons.push("nail or hair salon first");
  }
  if (venue.reviews < 20) score -= 1;
  return { score: Math.max(1, Math.min(5, score)), reasons };
}

/** "Cutting Edge Ladies Salon | Marina plaza" -> "cutting edge ladies salon": one row per brand and city. */
export function brandKey(name: string) {
  return name
    .split(/\s[|–-]\s/)[0]
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
