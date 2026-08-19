export type Service = {
  slug: string;
  number: string;
  title: string;
  summary: string;
  description: string;
  deliverables: string[];
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

export type ExpertiseArea = {
  title: string;
  description: string;
};

export const expertiseAreas: ExpertiseArea[] = [
  {
    title: "Custom Dashboards",
    description: "Transform complex data into clear insights with dashboards that help your team make faster, smarter decisions.",
  },
  {
    title: "Web Applications & Websites",
    description: "From high-converting marketing websites to powerful internal platforms, we create fast, modern experiences that drive results.",
  },
  {
    title: "AI Integrations & Automation",
    description: "Connect AI to your workflows to automate repetitive tasks, improve productivity, and unlock new capabilities.",
  },
  {
    title: "Native Mobile Apps",
    description: "Build seamless iOS and Android experiences that keep your business connected wherever work happens.",
  },
  {
    title: "CMS & Content Platforms",
    description: "Empower your team with flexible, easy-to-manage content systems tailored to your workflow.",
  },
];

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  location: string;
  description: string;
  outcome: string;
  stack: string[];
  image?: string;
  imageAlt?: string;
};

export const products: Product[] = [
  {
    slug: "fuelflo",
    name: "FuelFlo",
    tagline: "The proof layer behind fuel operations.",
    category: "Temporary power & fuel operations",
    location: "Saudi Arabia",
    description: "A field-to-report system that turns every fuel delivery into verified, timestamped, photo-backed evidence for generator and temporary power companies in Saudi Arabia.",
    outcome: "Built and pilot-ready: every fuel action verified with GPS, timestamp, and photo evidence — client-ready reports generated in seconds instead of hours.",
    stack: ["React Native", "Web dashboard (PWA)", "Supabase", "Offline-first sync", "GPS + photo capture"],
    image: "/fuelflo-offline.png",
    imageAlt: "FuelFlo mobile app showing a device field-readiness check, with local database, evidence storage, camera permission, GPS capture, and API sync all marked ready for offline use.",
  },
  {
    slug: "nick-whittaker-imagery",
    name: "Nick Whittaker Imagery",
    tagline: "An online gallery that shows interior designers and hospitality exactly how the art will look in the room.",
    category: "B2B photography gallery",
    location: "New Zealand",
    description:
      "A targeted online gallery for an ocean and water photographer — built for interior designers and hospitality buyers, not casual retail shoppers. Brand identity, logo, and design system designed end to end by Enodre, inspired directly by the artist's own photography, alongside dozens of custom room-context images showing each piece styled in real interior and hospitality spaces.",
    outcome:
      "Delivered a trade-focused gallery and store: a brand and site that feel as considered as the photography itself, dozens of custom room-context images so designers and hospitality buyers can picture the work in a space before they commit, and a checkout that's accurate for New Zealand buyers from day one.",
    stack: ["Next.js 16", "Tailwind CSS v4", "Supabase (Postgres + Auth)", "Stripe Checkout", "Server Actions", "Nodemailer"],
    image: "/nick/nick-front.jpg",
    imageAlt: "A laptop displaying the Nick Whittaker Imagery site, showing the 'Smooth Lines' print framed and styled in a warm living room.",
  },
];

export type Founder = {
  name: string;
  role: string;
  image: string;
  imageAlt: string;
  bio: string[];
};

export const founder: Founder = {
  name: "Olga",
  role: "Product Designer & Frontend Developer",
  image: "/olga_goryszewska_enodre.png",
  imageAlt: "Portrait of Olga Goryszewska",
  bio: [
    "Olga is a Product Designer and Frontend Developer who believes great software begins with understanding people, not just technology.",
    "With a background spanning UX strategy, product design, and modern web development, she helps businesses untangle complex workflows and transform them into intuitive digital experiences. Her work combines user research, interface design, and engineering to create products that are both elegant and practical.",
    "She specializes in designing dashboards, business applications, workflow automation, AI-powered solutions, and high-performance websites. Every project starts with one question: What's really slowing this business down? From there, she works closely with clients to uncover opportunities, simplify processes, and build software that delivers measurable results.",
    "Olga's approach is collaborative, detail-oriented, and focused on long-term value. Rather than building features for the sake of technology, she creates solutions that improve efficiency, reduce friction, and help businesses grow with confidence.",
    "Whether partnering with startups, growing companies, or enterprise teams, her goal remains the same: to design software that feels effortless to use and makes everyday work better.",
  ],
};

export type StackGroup = {
  heading: string;
  items: string[];
};

export const stackGroups: StackGroup[] = [
  {
    heading: "Tools we use",
    items: [
      "Visual Studio Code",
      "Figma",
      "Midjourney",
      "Canva",
      "Claude",
      "Codex",
      "ChatGPT",
      "Cursor",
    ],
  },
  {
    heading: "Stack we use",
    items: [
      "Next.js",
      "React",
      "React Native",
      "Tailwind CSS",
      "TypeScript",
      "SQL (backend)",
      "Supabase",
    ],
  },
];

export type PricingItem = {
  service: string;
  price: string;
  timeline: string;
};

export const projectPricing: PricingItem[] = [
  { service: "Discovery Workshop", price: "$300", timeline: "1 day" },
  { service: "UX Audit (existing site/product)", price: "$450", timeline: "2–3 days" },
  { service: "Landing Page Design & Development", price: "$900", timeline: "1–2 weeks" },
  { service: "Business Website (5–10 pages)", price: "$2,000", timeline: "2–3 weeks" },
  { service: "CMS Setup (WordPress / headless)", price: "$1,500", timeline: "2–3 weeks" },
  { service: "Custom Dashboard / Web App UI", price: "$3,200", timeline: "3–5 weeks" },
  { service: "Backend & Database Setup (Supabase, real-time sync, RLS)", price: "$2,000", timeline: "2–4 weeks" },
  { service: "Native Mobile App (React Native / Expo, offline-capable)", price: "$4,500", timeline: "6–10 weeks" },
  { service: "AI Feature Integration (chat, search, content tools)", price: "$1,200", timeline: "1–2 weeks" },
  { service: "Full Product Build (Web + Mobile + Backend)", price: "From $8,500", timeline: "8–14 weeks" },
];

export type PartnershipPlan = {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
};

export const partnershipPlans: PartnershipPlan[] = [
  {
    name: "Starter",
    price: "$600",
    cadence: "/ mo",
    features: [
      "Up to 8 hours",
      "Small features & fixes",
      "UX tweaks",
      "Email support (48-hr response)",
    ],
  },
  {
    name: "Growth",
    price: "$1,200",
    cadence: "/ mo",
    badge: "Most popular",
    highlighted: true,
    features: [
      "Up to 16 hours",
      "New features",
      "Dashboard/UI improvements",
      "Monthly check-in call",
      "Priority support (24-hr response)",
    ],
  },
  {
    name: "Product Partner",
    price: "$2,200",
    cadence: "/ mo",
    features: [
      "Up to 30 hours",
      "Ongoing design + development",
      "Light product roadmap input",
      "Bi-weekly meetings",
      "Priority delivery",
    ],
  },
];

export type ProcessStep = {
  title: string;
  description: string;
};

export const howWeWork: ProcessStep[] = [
  { title: "Discovery Call (free)", description: "15–30 min to understand the goal and rough scope." },
  { title: "Proposal", description: "Fixed starting price, timeline, and what's included — no surprises." },
  { title: "Design & Strategy", description: "Wireframes or UI direction signed off before development starts." },
  { title: "Development", description: "Built, tested across devices, and shared for feedback along the way." },
  { title: "Launch & Support", description: "Ships with a 14-day bug-fix window; ongoing support available via the plans above." },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}
