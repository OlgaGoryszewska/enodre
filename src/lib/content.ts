export type Service = {
  slug: string;
  number: string;
  title: string;
  summary: string;
  description: string;
  deliverables: string[];
};

export type CaseStudy = {
  slug: string;
  sector: string;
  title: string;
  summary: string;
  result: string;
  challenge: string;
  approach: string;
};

export const services: Service[] = [
  {
    slug: "workflow-design",
    number: "01",
    title: "Workflow design",
    summary: "Map the real work, remove friction, and define a system your team will actually use.",
    description: "We work alongside your team to understand how work moves today, where it gets stuck, and what a better operating model looks like.",
    deliverables: ["Process mapping", "Service blueprints", "Product requirements", "Implementation roadmap"],
  },
  {
    slug: "product-ux",
    number: "02",
    title: "Product & UX",
    summary: "Turn complex operational needs into calm, intuitive digital tools.",
    description: "We translate business rules and frontline realities into clear journeys, interfaces, and prototypes that can be tested early.",
    deliverables: ["User research", "Information architecture", "Interactive prototypes", "Design systems"],
  },
  {
    slug: "software-development",
    number: "03",
    title: "Software development",
    summary: "Build dependable web software, from field tools to operational dashboards.",
    description: "We build production-ready software with a focus on maintainability, performance, accessibility, and a clean handover.",
    deliverables: ["Frontend development", "Backend integrations", "Quality assurance", "Deployment and handover"],
  },
  {
    slug: "product-partnership",
    number: "04",
    title: "Product partnership",
    summary: "Keep improving after launch with focused product and engineering support.",
    description: "We stay close to the product after launch, using feedback and real usage to prioritise the improvements that matter most.",
    deliverables: ["Product strategy", "Iteration cycles", "Performance reviews", "Ongoing development"],
  },
];

export const caseStudies: CaseStudy[] = [
  {
    slug: "field-operations",
    sector: "Field operations",
    title: "From paper job sheets to one shared workflow",
    summary: "A mobile-first operations system connecting field teams, schedulers, and finance.",
    result: "Example outcome · replace with project metrics",
    challenge: "Critical job information lived across paper forms, spreadsheets, calls, and individual inboxes, making status difficult to see and admin costly.",
    approach: "We mapped the end-to-end job lifecycle, designed the field and office experiences together, and shipped the workflow in stages so the team could adopt it safely.",
  },
  {
    slug: "admin-control-centre",
    sector: "Business administration",
    title: "A clear control centre for a complex service",
    summary: "One dashboard for requests, approvals, documents, and reporting.",
    result: "Example outcome · replace with project metrics",
    challenge: "The operations team had no single view of work in progress, leading to duplicated updates and delays between departments.",
    approach: "We created a shared information model and a role-based dashboard that put exceptions, decisions, and next actions in one place.",
  },
  {
    slug: "fuelflo",
    sector: "Temporary power & fuel operations",
    title: "The proof layer behind fuel operations",
    summary: "A field-to-report system that turns every fuel delivery into verified, timestamped, photo-backed evidence for generator and temporary power companies.",
    result: "Built and pilot-ready: every fuel action verified with GPS, timestamp, and photo evidence — client-ready reports generated in seconds instead of hours.",
    challenge: "Fuel work happened across many sites, assets, and technicians, with proof scattered across photos, paper logs, spreadsheets, and messages. Missing or unclear records led to disputed fuel usage, slower invoicing, and weaker customer trust.",
    approach: "We designed a connected field-to-report flow — scan the asset, record readings, capture photo evidence, sync in real time, then review and report — so every fuel action is tied to its asset, technician, GPS location, meter reading, and evidence, with client-ready PDF reports generated in seconds.",
  },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function getCaseStudy(slug: string) {
  return caseStudies.find((study) => study.slug === slug);
}
