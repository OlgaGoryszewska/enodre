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
  // Around them, where Fresha has a page: the Costa Blanca, the coast west of Marbella, Cascais, Quinta do Lago.
  { slug: "es-rural-valencian-community/jávea", city: "Jávea", country: "Spain", currency: "EUR", market: 3 },
  { slug: "es-rural-valencian-community/altea", city: "Altea", country: "Spain", currency: "EUR", market: 3 },
  { slug: "es-benidorm", city: "Benidorm", country: "Spain", currency: "EUR", market: 2 },
  { slug: "es-rural-andalusia/estepona", city: "Estepona", country: "Spain", currency: "EUR", market: 3 },
  { slug: "pt-lisbon/cascais", city: "Cascais", country: "Portugal", currency: "EUR", market: 3 },
  {
    slug: "pt-rural-faro-district/almancil",
    city: "Almancil (Quinta do Lago)",
    country: "Portugal",
    currency: "EUR",
    market: 3,
  },
];

// --- Google Maps (Places API) ---------------------------------------------
// Premium medical aesthetic clinics in each area, including the small towns
// Fresha barely covers. A few areas per run, in turn, to stay in the free tier.

export type GoogleArea = { area: string; city: string; country: string; market: number; query: string };

const es = (area: string, city = area, market = 3): GoogleArea => ({
  area,
  city,
  country: "Spain",
  market,
  query: `clínica medicina estética ${area}`,
});
const pt = (area: string, city = area, market = 3): GoogleArea => ({
  area,
  city,
  country: "Portugal",
  market,
  query: `clínica medicina estética ${area} Portugal`,
});

export const GOOGLE_AREAS: GoogleArea[] = [
  // Costa Blanca: Scandinavian and British clients, and the towns you asked for first.
  es("Moraira"),
  es("Jávea"),
  es("Altea"),
  es("Albir"),
  es("Calpe"),
  es("Dénia"),
  es("Benidorm", "Benidorm", 2),
  // Marbella and around.
  es("Marbella"),
  es("Puerto Banús", "Marbella"),
  es("Estepona"),
  es("Benahavís"),
  es("Fuengirola", "Fuengirola", 2),
  // Mallorca.
  es("Palma de Mallorca"),
  es("Puerto Portals", "Palma de Mallorca"),
  es("Andratx", "Palma de Mallorca"),
  // The premium parts of the big cities.
  es("barrio de Salamanca Madrid", "Madrid"),
  es("Pozuelo de Alarcón", "Madrid"),
  es("Sant Gervasi Barcelona", "Barcelona"),
  es("Sitges", "Barcelona"),
  es("Valencia", "Valencia", 2),
  // Portugal.
  pt("Lisboa", "Lisbon", 2),
  pt("Cascais"),
  pt("Porto", "Porto", 2),
  pt("Vilamoura"),
  pt("Quinta do Lago", "Almancil (Quinta do Lago)"),
  pt("Albufeira", "Albufeira", 2),
];

/** Which areas a run searches: `count` of them, moving on each day. */
export function googleAreasFor(day: number, count: number, areas = GOOGLE_AREAS) {
  const start = (day * count) % areas.length;
  return Array.from({ length: Math.min(count, areas.length) }, (_, i) => areas[(start + i) % areas.length]);
}

export type GooglePlace = {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviews: number;
  website: string | null;
  phone: string | null;
  mapsUrl: string | null;
  types: string[];
  open: boolean;
};

/** A Places API (New) searchText result, flattened. */
export function parseGooglePlaces(json: unknown): GooglePlace[] {
  const places = (json as { places?: Record<string, unknown>[] })?.places ?? [];
  return places.map((place) => ({
    id: String(place.id ?? ""),
    name: String((place.displayName as { text?: string } | undefined)?.text ?? "").trim(),
    address: typeof place.formattedAddress === "string" ? place.formattedAddress : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviews: typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
    website: typeof place.websiteUri === "string" ? place.websiteUri : null,
    phone: typeof place.internationalPhoneNumber === "string" ? place.internationalPhoneNumber : null,
    mapsUrl: typeof place.googleMapsUri === "string" ? place.googleMapsUri : null,
    types: Array.isArray(place.types) ? place.types.map(String) : [],
    open: (place.businessStatus ?? "OPERATIONAL") === "OPERATIONAL",
  }));
}

const MEDICAL_TYPES = new Set([
  "doctor",
  "medical_clinic",
  "skin_care_clinic",
  "dermatologist",
  "plastic_surgeon",
  "health",
]);
const SALON_TYPES = new Set([
  "hair_salon",
  "hair_care",
  "nail_salon",
  "barber_shop",
  "beauty_salon",
  "spa",
  "dentist",
  "dental_clinic",
]);

/** Premium: well rated by many people. Below this a clinic is too small or uneven. */
export const GOOGLE_PREMIUM = { rating: 4.5, reviews: 40 };

/**
 * A Google place as a fit, 1–5, or null to skip it: open, a medical aesthetic
 * clinic (by name or Google's type, never a salon or dentist), and premium.
 */
export function judgeGooglePlace(place: GooglePlace, area: GoogleArea) {
  if (!place.open || !place.name) return null;
  const medicalType = place.types.some((type) => MEDICAL_TYPES.has(type));
  const salonOnly = place.types.some((type) => SALON_TYPES.has(type)) && !medicalType;
  const byName = isAestheticClinic(place.name);
  if (NOT_AESTHETIC.test(place.name) || PMU_NAME.test(place.name) || NAIL_OR_HAIR.test(place.name)) return null;
  // Medical aesthetic only: the name says aesthetic, and the place is medical by its name or Google's type.
  if (!AESTHETIC_WORD.test(place.name)) return null;
  if (!byName && (salonOnly || !medicalType)) return null;
  if ((place.rating ?? 0) < GOOGLE_PREMIUM.rating || place.reviews < GOOGLE_PREMIUM.reviews) return null;
  let score = area.market;
  const reasons = [`Google ${place.rating?.toFixed(1)}★ from ${place.reviews} reviews`];
  if (byName && MEDICAL.test(place.name)) {
    score += 1;
    reasons.push("medical aesthetic clinic");
  } else if (medicalType) {
    reasons.push("medical clinic on Google");
  }
  if (place.reviews >= 150 && (place.rating ?? 0) >= 4.7) {
    score += 1;
    reasons.push("top rated and busy");
  }
  return { score: Math.max(1, Math.min(5, score)), reasons };
}

/** Whether a clinic's own website already offers PMU or microblading. */
export function websiteOffersPmu(html: string) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  // Nail "semipermanente" isn't PMU; the named techniques are.
  return /(micropigment|microblad|maquillaje permanente|maquilhagem permanente|permanent make-?up|dermopigment|microshading|powder brows|lip blush|cejas pelo a pelo)/i.test(
    text
  );
}
// Injectables need a doctor in Spain and Portugal, so places listed for them are
// medical aesthetic clinics: the ones that can add PMU, and medical PMU, to their menu.
export const SCOUT_TREATMENTS = ["anti-wrinkle-injections", "dermal-fillers", "lip-fillers"];
// Fresha's pages per city: the injectables treatments, then its aesthetics and
// medspa listings, which are the only pages it has for the small coastal towns.
export const SCOUT_PAGES = [...SCOUT_TREATMENTS.map((treatment) => `tt/${treatment}`), "bt/aesthetics", "bt/medspas"];

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
  /** The highest price of any treatment on the menu. */
  topPrice: number | null;
};

// "Semipermanente" on a nail or lash menu is gel polish or a lash lift, not PMU.
const NOT_PMU_SERVICE =
  /(laser|l[áa]ser|depil|manicur|pedicur|u[ñn]as|unhas|nail|esmalt|gel\b|lash|pesta[ñn]|cílios|cilios|tinte|tint\b)/i;

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
  const allPrices: number[] = [];
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
      if (Number.isFinite(price) && price > 0) allPrices.push(price);
      if ((STRONG.test(name) || STRONG.test(category)) && !NOT_PMU_SERVICE.test(`${name} ${category}`)) {
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
    topPrice: allPrices.length ? Math.max(...allPrices) : null,
  };
}

const NAIL_OR_HAIR =
  /(nail|esmalt|manicur|uñas|unhas|peluquer|cabeleireir|hair (salon|studio)|barber|barbear|barbería|barberia)/i;
// Medical aesthetic clinics only: a bare "aesthetic" or "beauty" is usually a salon.
const MEDICAL =
  /(clinic|cl[ií]nica|klinik|medical|m[eé]dic|medispa|derma|surgery|cirug|cirurg|hospital|doctor|\bdr\.?\s|\bdra\.?\s|medicina est[eé]tica|medicine)/i;
const STUDIO = /(brow|pmu|ink|micro|lash|permanent|beauty bar|studio)/i;

// A name that says PMU, brows or lashes: a PMU studio, even if it calls itself a clinic.
const PMU_NAME = /(micropigment|microblad|\bpmu\b|permanent|\bbrows?\b|\blash|pesta[ñn]|cejas)/i;

// A name that says aesthetic medicine, skin, surgery or anti-ageing.
const AESTHETIC_WORD =
  /(est[eé]tic|esthetic|aesthetic|derma|cirug|cirurg|pl[aá]stic|antienvejec|anti-?ag|rejuven|l[aá]ser|capilar|longevit|skin)/i;

// Medical, but not aesthetic: dentists (who also do Botox), labs, nutrition, physio, opticians, vets.
const NOT_AESTHETIC =
  /(pilates|yoga|massag|fitness|gym|depila|m[ée]decine g[ée]n[ée]rale|medicina general|medicina familiar|dent|odonto|sorriso|smile|an[áa]lises|an[áa]lisis|laborat|nutri|fisio|physio|osteo|[óo]ptic|podolog|veterin|psicolog)/i;

/** A medical aesthetic clinic by its name: what the daily search keeps. */
export function isAestheticClinic(name: string) {
  return placeKind(name) === "clinic" && !NOT_AESTHETIC.test(name);
}

export function placeKind(name: string): "clinic" | "studio" | "salon" {
  if (PMU_NAME.test(name)) return "studio";
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

// A premium menu, by currency: the dearest treatment (fillers, lifts, lasers) at least this.
const PREMIUM: Record<string, number> = { GBP: 400, EUR: 400 };

/**
 * How good a fit a medical aesthetic clinic is, 1–5: the market's pay, then a
 * medical name, premium prices and a busy team. Clinics with PMU already on
 * the menu score lower: the best fit is a clinic that doesn't offer it yet.
 */
export function placeValue(city: ScoutCity, venue: FreshaVenue, details: FreshaDetails | null) {
  let score = city.market;
  const reasons: string[] = [];
  if (MEDICAL.test(venue.name)) {
    score += 1;
    reasons.push("medical aesthetic clinic");
  }
  if (details?.topPrice && details.topPrice >= (PREMIUM[city.currency] ?? Infinity)) {
    score += 1;
    reasons.push(`premium prices (up to ${city.currency} ${Math.round(details.topPrice)})`);
  }
  if ((details?.teamSize ?? 0) >= 10 || venue.reviews >= 500) {
    score += 1;
    reasons.push(details?.teamSize ? `team of ${details.teamSize}` : `${venue.reviews} reviews`);
  }
  if (details && details.pmuServices.length === 0) {
    reasons.push("no PMU on its menu yet: pitch adding it");
  }
  if (details && details.pmuServices.length > 0) {
    score -= 1;
    reasons.push("already offers PMU");
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
