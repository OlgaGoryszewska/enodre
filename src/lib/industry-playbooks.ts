// Outreach playbooks per target industry. Everything here is a HYPOTHESIS about
// how companies in an industry tend to work — never a claim about a specific
// company. Messages pick ONE question from the playbook; discovery calls find
// out what's actually true. Pure data + helpers, no imports (unit-tested).

// Keep in sync with the check in supabase/outreach_system.sql.
export const INDUSTRY_VALUES = [
  "contractor",
  "electrical_plumbing",
  "equipment_rental",
  "technical_service",
  "logistics",
  "fuel_energy",
  "cleaning_facility",
  "other",
] as const;
export type Industry = (typeof INDUSTRY_VALUES)[number];

export type Playbook = {
  label: string;
  /** A typical chain from job to invoice — where manual work may hide. */
  workflow: string[];
  manualTasks: string[];
  bottlenecks: string[];
  automation: string[];
  /** Discovery questions (Norwegian) that uncover the real problem. */
  discoveryQuestions: string[];
  /** What to look for when researching a company. */
  signals: string[];
  /** One-sentence operational questions for a first message (NO, EN pairs). */
  openingQuestions: { no: string; en: string }[];
  /** The value sentence, adapted to the industry (NO, EN). */
  value: { no: string; en: string };
  /** Who we work with, for the generic opening when no fact is verified. */
  peers: { no: string; en: string };
};

const GENERIC_VALUE = {
  no: "I Enodre hjelper vi bedrifter med å forenkle arbeidsflyten mellom felt og kontor, slik at mindre tid går til dobbeltarbeid og manuell registrering.",
  en: "At Enodre we help companies simplify the workflow between the field and the office, so less time goes into duplicate work and manual data entry.",
};

export const PLAYBOOKS: Record<Industry, Playbook> = {
  contractor: {
    label: "Contractors and construction",
    workflow: [
      "Job completed",
      "Hours and materials noted",
      "Documentation (photos, checklists, KS)",
      "Office review",
      "Invoice prepared",
      "Invoice sent",
    ],
    manualTasks: [
      "Timesheets collected by text or paper",
      "Materials typed in again at the office",
      "KS/HMS documentation assembled by hand",
      "Change orders tracked in email",
    ],
    bottlenecks: [
      "Waiting for hours and notes from the site",
      "Missing documentation delays invoicing",
      "Change orders forgotten on the invoice",
    ],
    automation: [
      "Hours, materials and photos registered once on the phone",
      "Documentation compiled automatically per project",
      "Draft invoices from completed jobs",
    ],
    discoveryQuestions: [
      "Hva skjer fra en jobb er ferdig til fakturaen er sendt?",
      "Hvordan kommer timer og materiell fra byggeplassen til kontoret?",
      "Hvordan samler dere KS- og HMS-dokumentasjonen?",
      "Hvor ofte blir tillegg eller endringer glemt på fakturaen?",
    ],
    signals: [
      "Hiring site managers or project admin",
      "New projects or framework agreements",
      "Several crews or regions",
      "Gaselle or growth news",
    ],
    openingQuestions: [
      {
        no: "Hvordan kommer timer, materiell og dokumentasjon fra prosjektene og inn til kontoret hos dere i dag?",
        en: "How do hours, materials and documentation get from your projects to the office today?",
      },
      {
        no: "Hvordan håndterer dere KS- og HMS-dokumentasjonen fra jobbene i praksis?",
        en: "How do you handle the KS/HMS documentation from your jobs in practice?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "entreprenører og byggebedrifter", en: "contractors and construction companies" },
  },
  electrical_plumbing: {
    label: "Electricians and plumbers",
    workflow: [
      "Service job booked",
      "Technician on site",
      "Work report and materials",
      "Office checks the job",
      "Invoice to customer",
    ],
    manualTasks: [
      "Work orders on paper or in several apps",
      "Materials list retyped for the invoice",
      "Customer reports written after the fact",
    ],
    bottlenecks: [
      "Reports arrive days after the job",
      "Small jobs forgotten or invoiced late",
      "Office chasing technicians for details",
    ],
    automation: [
      "One digital work order from booking to invoice",
      "Materials and hours captured on site",
      "Customer report sent automatically",
    ],
    discoveryQuestions: [
      "Hvordan rapporterer montørene en ferdig jobb?",
      "Hvor lang tid går det fra jobben er ferdig til fakturaen går ut?",
      "Hvordan håndterer dere små servicejobber som skal faktureres?",
    ],
    signals: [
      "Hiring technicians or apprentices",
      "New service areas (e.g. heat pumps, EV chargers, solar)",
      "Service agreements with housing cooperatives",
    ],
    openingQuestions: [
      {
        no: "Hvordan rapporterer montørene ferdige jobber hos dere – og hvordan kommer det videre til fakturering?",
        en: "How do your technicians report finished jobs – and how does that get to invoicing?",
      },
      {
        no: "Hvordan håndterer dere timeregistrering og servicerapporter fra jobbene i dag?",
        en: "How do you handle time registration and service reports from jobs today?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "elektro- og rørleggerbedrifter", en: "electrical and plumbing companies" },
  },
  equipment_rental: {
    label: "Equipment rental",
    workflow: [
      "Order received",
      "Equipment out (check-out, condition)",
      "Rental period",
      "Return and inspection",
      "Damage/fuel/extras noted",
      "Invoice",
    ],
    manualTasks: [
      "Check-out and return forms on paper",
      "Damage and fuel noted by hand",
      "Rental days counted manually for invoicing",
    ],
    bottlenecks: [
      "Disputes about condition without photos",
      "Extras missed on the invoice",
      "Availability tracked in spreadsheets",
    ],
    automation: [
      "Digital check-out/return with photos",
      "Rental days and extras calculated automatically",
      "Invoice drafted on return",
    ],
    discoveryQuestions: [
      "Hvordan dokumenterer dere utlevering og retur av utstyr?",
      "Hvordan blir skader, drivstoff og tillegg med på fakturaen?",
      "Hvordan holder dere oversikt over hva som er ute hos hvem?",
    ],
    signals: ["New depots or locations", "New equipment categories", "Hiring depot staff or drivers"],
    openingQuestions: [
      {
        no: "Hvordan dokumenterer dere utlevering og retur av utstyret i dag – og hvordan blir tillegg med på fakturaen?",
        en: "How do you document equipment check-out and return today – and how do extras make it onto the invoice?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "utleiebedrifter", en: "rental companies" },
  },
  technical_service: {
    label: "Technical service and maintenance",
    workflow: [
      "Service request or planned maintenance",
      "Technician dispatched",
      "Inspection/repair",
      "Service report",
      "Parts and hours",
      "Invoice and report to customer",
    ],
    manualTasks: [
      "Service reports written after the visit",
      "Parts used noted on paper",
      "Maintenance schedules in spreadsheets",
    ],
    bottlenecks: ["Reports to customers delayed", "Planned maintenance missed", "Parts not invoiced"],
    automation: [
      "Service report completed on site with photos",
      "Maintenance schedule triggers jobs",
      "Parts and hours flow to the invoice",
    ],
    discoveryQuestions: [
      "Hvordan lager dere servicerapporten etter et besøk?",
      "Hvordan planlegger dere periodisk vedlikehold?",
      "Hvordan kommer deler og timer fra servicebesøket til fakturaen?",
    ],
    signals: [
      "Service contracts with large customers",
      "Hiring service technicians",
      "New certifications or service areas",
    ],
    openingQuestions: [
      {
        no: "Hvordan lager dere servicerapporter etter besøk hos kunden – skrives de ute eller etterpå på kontoret?",
        en: "How do you produce service reports after customer visits – written on site or afterwards at the office?",
      },
      {
        no: "Hvordan holder dere oversikt over periodisk vedlikehold og servicebesøk i dag?",
        en: "How do you keep track of planned maintenance and service visits today?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "service- og vedlikeholdsbedrifter", en: "service and maintenance companies" },
  },
  logistics: {
    label: "Haulage and logistics",
    workflow: [
      "Order",
      "Route planning",
      "Driver delivers (proof of delivery)",
      "Waiting time/extras noted",
      "Order closed",
      "Invoice",
    ],
    manualTasks: [
      "Orders taken by phone and email",
      "Delivery notes on paper",
      "Waiting time and extras reported by text",
    ],
    bottlenecks: [
      "Proof of delivery arrives late",
      "Extras and waiting time not invoiced",
      "Route changes communicated by phone",
    ],
    automation: [
      "Orders flow into planning",
      "Digital proof of delivery with photo and time",
      "Extras added to the invoice automatically",
    ],
    discoveryQuestions: [
      "Hvordan kommer ordrene inn til dere – telefon, e-post eller system?",
      "Hvordan får dere bekreftelse på levering fra sjåførene?",
      "Hvordan blir ventetid og tillegg med på fakturaen?",
    ],
    signals: ["Hiring drivers or route planners", "New routes or terminals", "Growth in fleet"],
    openingQuestions: [
      {
        no: "Hvordan får dere leveringsbekreftelse og tillegg fra sjåførene inn i systemet i dag?",
        en: "How do you get delivery confirmations and extras from drivers into your system today?",
      },
      {
        no: "Hvordan kommer ordrene inn og videre til ruteplanleggingen hos dere?",
        en: "How do orders come in and reach route planning at your company?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "transport- og logistikkbedrifter", en: "haulage and logistics companies" },
  },
  fuel_energy: {
    label: "Fuel distribution and energy service",
    workflow: [
      "Order or scheduled refill",
      "Delivery/refuel on site",
      "Volume and proof (photo, GPS)",
      "Customer report",
      "Invoice",
    ],
    manualTasks: [
      "Delivery volumes written down and retyped",
      "Proof of delivery collected by hand",
      "Customer reports assembled manually",
    ],
    bottlenecks: [
      "Disputes about delivered volumes",
      "Reports to customers take hours",
      "Scheduled refills tracked in spreadsheets",
    ],
    automation: [
      "Each delivery logged with volume, GPS, time and photo",
      "Customer reports generated automatically",
      "Delivery data flows to the invoice",
    ],
    discoveryQuestions: [
      "Hvordan dokumenterer dere leveranser og påfyllinger ute hos kunden?",
      "Hvordan lager dere rapporter til kundene om leverte volumer?",
      "Hvordan planlegger dere faste påfyllinger?",
    ],
    signals: ["Hiring drivers or order takers", "New depots or regions", "Large framework customers"],
    openingQuestions: [
      {
        no: "Hvordan dokumenterer dere leveranser og påfyllinger ute hos kunden i dag – og hvordan blir det til rapport og faktura?",
        en: "How do you document deliveries and refuels at the customer's site today – and how does that become a report and invoice?",
      },
    ],
    value: {
      no: "I Enodre hjelper vi bedrifter med å forenkle arbeidsflyten mellom felt og kontor – vi har blant annet bygget et system for dokumentasjon av drivstoffleveranser.",
      en: "At Enodre we help companies simplify the workflow between the field and the office – among other things we've built a system for documenting fuel deliveries.",
    },
    peers: { no: "drivstoff- og energibedrifter", en: "fuel and energy companies" },
  },
  cleaning_facility: {
    label: "Cleaning and facility services",
    workflow: ["Contract or one-off job", "Staff on site", "Extras and deviations noted", "Quality checks", "Invoice"],
    manualTasks: ["Extra jobs reported by text", "Quality checklists on paper", "Hours collected from many sites"],
    bottlenecks: [
      "Extras beyond the contract not invoiced",
      "Hours from many sites hard to gather",
      "No documentation of work done",
    ],
    automation: [
      "Extras and deviations logged on the phone",
      "Checklists with photos per site",
      "Hours and extras ready for invoicing",
    ],
    discoveryQuestions: [
      "Hvordan får dere med ekstraoppdrag utover de faste avtalene?",
      "Hvordan samler dere timer fra mange kundesteder?",
      "Hvordan dokumenterer dere utført arbeid overfor kundene?",
    ],
    signals: ["New customer contracts", "Several regions or sites", "Hiring cleaners or supervisors"],
    openingQuestions: [
      {
        no: "Hvordan får dere ekstraoppdrag og timer fra de ansatte ute hos kundene inn til kontoret i dag?",
        en: "How do extra jobs and hours from your staff at customer sites reach the office today?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "renholds- og driftsbedrifter", en: "cleaning and facility companies" },
  },
  other: {
    label: "Other field operations",
    workflow: ["Work done in the field", "Information recorded", "Office processing", "Invoice or report"],
    manualTasks: ["Information typed in more than once", "Reports assembled by hand"],
    bottlenecks: ["Waiting for information from the field", "Duplicate data entry"],
    automation: ["Capture information once in the field", "Flow it into the systems already in use"],
    discoveryQuestions: [
      "Hvilke oppgaver gjentar dere hver dag eller uke?",
      "Hvor tastes den samme informasjonen inn flere ganger?",
    ],
    signals: ["Growth or hiring", "New services or locations"],
    openingQuestions: [
      {
        no: "Hvordan kommer informasjonen fra de ansatte ute og inn til kontoret hos dere i dag?",
        en: "How does information from your people in the field reach the office today?",
      },
    ],
    value: GENERIC_VALUE,
    peers: { no: "bedrifter med folk ute på oppdrag", en: "companies with people out on jobs" },
  },
};

/** Brønnøysund SN2025 industry code → playbook. */
export function industryFromCode(code: string | null | undefined): Industry {
  if (!code) return "other";
  if (code.startsWith("43.21") || code.startsWith("43.22")) return "electrical_plumbing";
  if (code.startsWith("41.") || code.startsWith("42.") || code.startsWith("43.")) return "contractor";
  if (code.startsWith("77.3")) return "equipment_rental";
  if (code.startsWith("33.") || code.startsWith("09.")) return "technical_service";
  if (code.startsWith("49.") || code.startsWith("52.")) return "logistics";
  if (code.startsWith("46.81") || code.startsWith("35.")) return "fuel_energy";
  if (code.startsWith("81.")) return "cleaning_facility";
  return "other";
}

// ---------------------------------------------------------------------------
// Follow-ups: the sequence, and replies by how the prospect answered.

export const SEQUENCE_STEPS = ["first_message", "follow_up", "final_follow_up"] as const;

export type ResponseType = "positive" | "not_now" | "has_system" | "not_relevant";

export const RESPONSE_LABELS: Record<ResponseType, string> = {
  positive: "Interested / describes a problem",
  not_now: "Not now",
  has_system: "We already have a system",
  not_relevant: "Not relevant / no thanks",
};

/** Suggested replies by response type (Norwegian, editable before sending). */
export const RESPONSE_REPLIES: Record<ResponseType, string> = {
  positive:
    "Takk for at du tok deg tid til å svare – det høres ut som noe vi kjenner godt igjen. Kunne vi tatt en kort prat på 15–20 minutter, så jeg forstår hvordan dere jobber i dag? Jeg skal ikke selge noe i den samtalen.",
  not_now: "Helt forståelig – takk for svaret. Er det greit om jeg tar kontakt igjen om et par måneder?",
  has_system:
    "Så bra at dere har et system på plass. Vi jobber ofte med å koble sammen systemene bedrifter allerede har, slik at informasjonen ikke må tastes inn flere ganger. Er det noe i flyten i dag dere fortsatt gjør manuelt?",
  not_relevant: "Takk for at du svarte – da skal jeg ikke forstyrre mer. Lykke til videre!",
};
