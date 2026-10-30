// Brønnøysundregistrene open API (Enhetsregisteret) — free, no key, NLOD 2.0.
// Docs: https://data.brreg.no/enhetsregisteret/api/docs/index.html

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api";
const PAGE_SIZE = 100;
// The API caps paging at 10,000 results; we stop far earlier anyway.
const MAX_PAGES = 20;

export type BrregCompany = {
  orgNumber: string;
  name: string;
  industryCode: string | null;
  industryLabel: string | null;
  employees: number | null;
  municipality: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  founded: string | null;
  // The email in the register, when the company has given one (often missing).
  email: string | null;
};

type BrregAddress = {
  adresse?: string[];
  postnummer?: string;
  poststed?: string;
  kommune?: string;
  kommunenummer?: string;
};

type BrregEntity = {
  organisasjonsnummer: string;
  navn: string;
  naeringskode1?: { kode: string; beskrivelse: string };
  antallAnsatte?: number;
  forretningsadresse?: BrregAddress;
  telefon?: string;
  mobil?: string;
  hjemmeside?: string;
  stiftelsesdato?: string;
  epostadresse?: string;
};

type BrregRole = {
  type: { kode: string; beskrivelse: string };
  person?: { navn?: { fornavn?: string; mellomnavn?: string; etternavn?: string } };
  fratraadt?: boolean;
  avregistrert?: boolean;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Brønnøysund API ${response.status} for ${url}`);
  return (await response.json()) as T;
}

function toCompany(entity: BrregEntity): BrregCompany {
  const address = entity.forretningsadresse;
  const website = entity.hjemmeside
    ? entity.hjemmeside.startsWith("http")
      ? entity.hjemmeside
      : `https://${entity.hjemmeside}`
    : null;
  return {
    orgNumber: entity.organisasjonsnummer,
    name: entity.navn,
    industryCode: entity.naeringskode1?.kode ?? null,
    industryLabel: entity.naeringskode1?.beskrivelse ?? null,
    employees: entity.antallAnsatte ?? null,
    municipality: address?.kommune ?? null,
    address: address
      ? [address.adresse?.join(", "), [address.postnummer, address.poststed].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ")
      : null,
    phone: entity.telefon ?? entity.mobil ?? null,
    website,
    founded: entity.stiftelsesdato ?? null,
    email: entity.epostadresse ?? null,
  };
}

/** Every municipality number in the given counties (first two digits = county). */
export async function getMunicipalityNumbers(countyCodes: string[]) {
  const data = await getJson<{ _embedded?: { kommuner: { nummer: string }[] } }>(`${BASE_URL}/kommuner?size=1000`);
  return (data._embedded?.kommuner ?? [])
    .map((kommune) => kommune.nummer)
    .filter((nummer) => countyCodes.includes(nummer.slice(0, 2)));
}

/**
 * Active companies (not bankrupt, not winding up) matching the filters,
 * skipping org numbers in `exclude`, until `limit` new ones are found.
 */
export async function searchCompanies(params: {
  industryCodes: string[];
  municipalityNumbers: string[];
  minEmployees: number;
  maxEmployees: number;
  limit: number;
  exclude: Set<string>;
}) {
  const query = new URLSearchParams({
    naeringskode: params.industryCodes.join(","),
    kommunenummer: params.municipalityNumbers.join(","),
    fraAntallAnsatte: String(params.minEmployees),
    tilAntallAnsatte: String(params.maxEmployees),
    konkurs: "false",
    underAvvikling: "false",
    underTvangsavviklingEllerTvangsopplosning: "false",
    sort: "antallAnsatte,desc",
    size: String(PAGE_SIZE),
  });

  const companies: BrregCompany[] = [];
  let totalMatches = 0;

  for (let page = 0; page < MAX_PAGES && companies.length < params.limit; page++) {
    query.set("page", String(page));
    const data = await getJson<{
      _embedded?: { enheter: BrregEntity[] };
      page: { totalElements: number; totalPages: number };
    }>(`${BASE_URL}/enheter?${query}`);

    totalMatches = data.page.totalElements;
    for (const entity of data._embedded?.enheter ?? []) {
      if (params.exclude.has(entity.organisasjonsnummer)) continue;
      companies.push(toCompany(entity));
      if (companies.length >= params.limit) break;
    }
    if (page + 1 >= data.page.totalPages) break;
  }

  return { companies, totalMatches };
}

/**
 * One company by org number. Job ads often name a branch (underenhet), so
 * that's resolved to its parent company. Null if it isn't in the register.
 */
export async function getCompany(orgNumber: string): Promise<BrregCompany | null> {
  const fetchEntity = async (path: string) => {
    const response = await fetch(`${BASE_URL}/${path}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) throw new Error(`Brønnøysund API ${response.status} for ${path}`);
    return response.json();
  };
  const entity = (await fetchEntity(`enheter/${orgNumber}`)) as BrregEntity | null;
  if (entity) return toCompany(entity);
  const branch = (await fetchEntity(`underenheter/${orgNumber}`)) as { overordnetEnhet?: string } | null;
  if (!branch?.overordnetEnhet) return null;
  const parent = (await fetchEntity(`enheter/${branch.overordnetEnhet}`)) as BrregEntity | null;
  return parent ? toCompany(parent) : null;
}

/** The current daglig leder (or, failing that, chair of the board), if registered. */
export async function getKeyPerson(orgNumber: string) {
  const data = await getJson<{ rollegrupper?: { roller: BrregRole[] }[] }>(`${BASE_URL}/enheter/${orgNumber}/roller`);
  const roles = (data.rollegrupper ?? []).flatMap((group) => group.roller);
  const active = roles.filter((role) => role.person?.navn && !role.fratraadt && !role.avregistrert);
  const person = active.find((role) => role.type.kode === "DAGL") ?? active.find((role) => role.type.kode === "LEDE");
  if (!person?.person?.navn) return null;

  const { fornavn, mellomnavn, etternavn } = person.person.navn;
  return {
    name: [fornavn, mellomnavn, etternavn].filter(Boolean).join(" "),
    role: person.type.beskrivelse,
  };
}
