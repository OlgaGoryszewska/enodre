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
  category: string;
};

export const expertiseAreas: ExpertiseArea[] = [
  {
    category: "Product Development",
    title: "Custom Software Development",
    description: "Tailored software built around how your business actually operates, not a one-size-fits-all template.",
  },
  {
    category: "Product Development",
    title: "AI Automation Engineer",
    description: "Agentic workflows and automations built with n8n and Make, wired up with Claude and GPT API integrations.",
  },
  {
    category: "Product Development",
    title: "MVP Development",
    description: "Go from idea to a working product fast, scoped tightly around the riskiest assumptions worth testing first.",
  },
  {
    category: "Product Development",
    title: "LMS Development",
    description: "Custom learning management systems built around how your courses, cohorts, and content actually work.",
  },
  {
    category: "Product Development",
    title: "Web Development",
    description: "From high-converting marketing websites to powerful internal platforms, we create fast, modern experiences.",
  },
  {
    category: "Product Development",
    title: "UI & UX Design",
    description: "User research, information architecture, and interface design that make complex products feel simple.",
  },
  {
    category: "Product Development",
    title: "SaaS Development",
    description: "Design and build multi-tenant SaaS products with the billing, auth, and account structure to grow on.",
  },
  {
    category: "Product Development",
    title: "Mobile App Development",
    description: "Native and cross-platform iOS and Android experiences that keep your business connected wherever work happens.",
  },
  {
    category: "Modernize & Maintain",
    title: "Legacy Code Refactoring",
    description: "Modernize ageing codebases for maintainability and performance without disrupting the business running on them.",
  },
  {
    category: "Modernize & Maintain",
    title: "Software Code Audit",
    description: "A thorough technical assessment of your codebase's quality, security, and scalability, with a clear action plan.",
  },
  {
    category: "Modernize & Maintain",
    title: "Systems Integration",
    description: "Connect the tools your business already relies on so data moves between them without manual work.",
  },
  {
    category: "Cloud & DevOps",
    title: "DevOps",
    description: "Automate deployment, monitoring, and scaling so releases are routine instead of risky.",
  },
  {
    category: "Cloud & DevOps",
    title: "Cloud Migration",
    description: "Move applications and data to the cloud with minimal downtime and a plan for cost and performance after launch.",
  },
  {
    category: "Cloud & DevOps",
    title: "Azure Consulting",
    description: "Architecture, cost, and reliability guidance for teams building on Microsoft Azure.",
  },
];

export type Industry = {
  title: string;
  description: string;
  image?: string;
};

export const industries: Industry[] = [
  {
    title: "Healthcare",
    description: "Patient-facing and clinical tools, including EHR/EMR and telemedicine platforms.",
    image: "/healthcare-img.png",
  },
  {
    title: "Fintech",
    description: "Products handling payments, transactions, and financial data at production-grade reliability.",
  },
  {
    title: "eCommerce",
    description: "Storefronts, checkout flows, and back-office tools built to convert and scale.",
  },
  {
    title: "Education",
    description: "Learning management systems and platforms for course delivery and student engagement.",
  },
  {
    title: "Retail",
    description: "Inventory, point-of-sale, and customer-facing systems for physical and online retail.",
  },
  {
    title: "Media & Entertainment",
    description: "Content platforms and applications built for audience reach and engagement at scale.",
  },
  {
    title: "Human Resources",
    description: "Recruiting, onboarding, and workforce management tools that simplify HR operations.",
  },
  {
    title: "Wellness & Fitness",
    description: "Mental health, fitness, and wellness apps designed around everyday habits and routines.",
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
  url?: string;
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
    url: "https://fuelflo.app",
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
    url: "https://www.nickwhittakerimagery.com/",
    image: "/nick/nick-front.jpg",
    imageAlt: "A laptop displaying the Nick Whittaker Imagery site, showing the 'Smooth Lines' print framed and styled in a warm living room.",
  },
  {
    slug: "bialy-lotos",
    name: "Biały Lotos",
    tagline: "A content-driven salon site that turns a client's concern into the right treatment, price, and booking link.",
    category: "Beauty & cosmetology website",
    location: "Poland",
    description:
      "A five-treatment beauty and cosmetology salon in Ciechanów, Poland — permanent makeup, laser hair removal, brow and lash styling, and piercing, all under one roof. A gold lotus brand identity and a content system generated from six structured data modules, designed and built solo by Enodre, with every booking routed straight to the salon's existing Booksy profile.",
    outcome:
      "Delivered a live, content-driven salon site: 15 dynamic treatment pages and 6 problem-led pages generated from structured data, a searchable price list spanning PMU, cosmetology, laser, and piercing, and a booking path from discovery to Booksy — designed, built, and shipped solo.",
    stack: ["Next.js", "React 18", "Tailwind CSS", "Jest", "React Testing Library", "Vercel"],
    url: "https://www.salonbialylotos.pl/",
    image: "/lotos/front-sylwia.png",
    imageAlt: "A laptop displaying the Biały Lotos Zabiegi page, showing three close-up beauty portraits above the Makijaż Permanentny treatment category.",
  },
  {
    slug: "ceylons-house",
    name: "Ceylon's House",
    tagline: "A tropical luxury brand identity and website for a boutique hotel and rooftop restaurant in Sri Lanka.",
    category: "Hospitality brand & website",
    location: "Hikkaduwa, Sri Lanka",
    description:
      "A boutique hotel and rooftop restaurant in Hikkaduwa, Sri Lanka, built into a full brand and digital experience from scratch. A tropical luxury identity — palms, peacocks, jungle textures, and warm natural light — carried through a lightweight HTML, CSS, and JavaScript website designed around how travelers actually browse: a quick sense of place, proof of quality, and a clear path to booking.",
    outcome:
      "Delivered a complete brand-to-launch project: a tropical luxury identity translated into a live, production-ready website, from first logo concept through to deployment — the full lifecycle of identity design, website execution, and a real public launch.",
    stack: ["Brand identity design", "HTML", "CSS", "JavaScript", "Netlify"],
    url: "http://ceylonshouse.com/",
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
  image: "/profile-olga_goryszewska_enodre-portfolio-image.png",
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
      "PWA",
      "Tailwind CSS",
      "TypeScript",
      "SQL (backend)",
      "Supabase",
      "Stripe",
      "Nodemailer",
      "Vercel",
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

export type ProcessSubStep = {
  title: string;
  description: string;
};

export type ProcessPhase = {
  id: string;
  tabLabel: string;
  subSteps: ProcessSubStep[];
  tags: string[];
};

export const processPhases: ProcessPhase[] = [
  {
    id: "discover-planning",
    tabLabel: "Discover & Planning",
    subSteps: [
      {
        title: "Discover",
        description: "We conduct a technical audit, identify challenges, and gather requirements to ensure a solid foundation.",
      },
      {
        title: "Planning",
        description: "We create a structured roadmap with clear milestones, timelines, and resource allocation.",
      },
    ],
    tags: ["Mobile App", "Design System", "Admin Dashboard", "Payment Types"],
  },
  {
    id: "design-development",
    tabLabel: "Design & Development",
    subSteps: [
      {
        title: "Design",
        description: "We create a clean, user-friendly interface focused on functionality and ease of use.",
      },
      {
        title: "Development",
        description: "Our engineers build a fast, scalable, and reliable solution tailored to your needs.",
      },
    ],
    tags: ["User Flow", "Wireframing", "Prototyping"],
  },
  {
    id: "testing",
    tabLabel: "Testing",
    subSteps: [
      {
        title: "Testing",
        description: "We run functional, performance, and security tests to catch issues before they ever reach your users.",
      },
    ],
    tags: ["Unit Tests", "Bug Reports", "Performance"],
  },
  {
    id: "release",
    tabLabel: "Release",
    subSteps: [
      {
        title: "Release",
        description: "We deploy to production with a rollout plan that minimizes risk, downtime, and last-minute surprises.",
      },
    ],
    tags: ["Production", "Rollback Plan", "Versioning"],
  },
  {
    id: "support",
    tabLabel: "Support",
    subSteps: [
      {
        title: "Support",
        description: "We stay close after launch, ready to fix, improve, and extend the product as your needs grow.",
      },
    ],
    tags: ["Monitoring", "Bug Fixes", "Feature Requests"],
  },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}
