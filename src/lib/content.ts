export type ExpertiseProcessStep = {
  title: string;
  description: string;
};

export type ExpertiseFaq = {
  question: string;
  answer: string;
};

export type ExpertiseMetric = {
  label: string;
  before: string;
  after: string;
  beforePct: number;
  afterPct: number;
  benefit: string;
};

export type MetricsChartType = "dumbbell" | "slope" | "grouped-bar" | "radial-gauge" | "bullet" | "arrow" | "split-bar";

export type ExpertiseArea = {
  slug: string;
  title: string;
  description: string;
  category: string;
  image: string;
  process: ExpertiseProcessStep[];
  faqs: ExpertiseFaq[];
  metrics: ExpertiseMetric[];
  metricsColor: string;
  metricsChart: MetricsChartType;
  metricsChartOrientation?: "horizontal" | "vertical";
};

export const expertiseAreas: ExpertiseArea[] = [
  {
    slug: "custom-software-development",
    category: "Product Development",
    title: "Custom Software Development",
    description: "Tailored software built around how your business actually operates, not a one-size-fits-all template.",
    image: "/custome-software-img.png",
    process: [
      { title: "Discovery", description: "Audit your current workflows and pin down exactly what the software needs to do." },
      { title: "Architecture", description: "Design a system structure that fits how your business actually operates, not a generic template." },
      { title: "Build", description: "Develop the product in focused iterations, with working software to review at every stage." },
      { title: "Test & Harden", description: "Functional, performance, and security testing before anything ships." },
      { title: "Launch & Support", description: "Deploy to production and stay on for fixes and improvements as real usage comes in." },
    ],
    faqs: [
      {
        question: "How long does a custom software project usually take?",
        answer:
          "Most projects run 8–14 weeks depending on scope, though a focused first version can ship sooner. You'll get a concrete timeline once we've scoped the work.",
      },
      {
        question: "Do I own the code once it's built?",
        answer: "Yes, completely. The code, the repository, and every asset are yours from day one.",
      },
      {
        question: "What if my requirements change mid-project?",
        answer:
          "Normal and expected. Small changes get absorbed as we go; anything that meaningfully expands scope gets a clear estimate before it starts.",
      },
      {
        question: "Can you work with my existing team or codebase?",
        answer:
          "Yes — we regularly plug into existing repos, coding standards, and in-house teams rather than building in isolation.",
      },
    ],
    metricsColor: "#3661C4",
    metricsChart: "dumbbell",
    metrics: [
      {
        label: "Manual process time / week",
        before: "20 hrs",
        after: "4 hrs",
        beforePct: 100,
        afterPct: 20,
        benefit: "80% less manual work — repetitive tasks get automated into the software itself.",
      },
      {
        label: "Feature request turnaround",
        before: "6 wks",
        after: "2 wks",
        beforePct: 100,
        afterPct: 33,
        benefit: "3x faster delivery — a codebase built for change instead of fighting it.",
      },
      {
        label: "Data entry errors / month",
        before: "15",
        after: "2",
        beforePct: 100,
        afterPct: 13,
        benefit: "87% fewer errors — validation and structure replace manual re-typing.",
      },
    ],
  },
  {
    slug: "mvp-development",
    category: "Product Development",
    title: "MVP Development",
    description: "Go from idea to a working product fast, scoped tightly around the riskiest assumptions worth testing first.",
    image: "/mvp-image.png",
    process: [
      { title: "Riskiest Assumption", description: "Identify the one thing that has to be true for the product to work, and build to test it." },
      { title: "Lean Scope", description: "Cut everything that isn't essential to proving the concept." },
      { title: "Core Build", description: "Ship the smallest version that lets real users complete the key action." },
      { title: "Real-User Testing", description: "Get the MVP in front of actual users fast and watch what happens." },
      { title: "Launch & Iterate", description: "Use real feedback to decide what to build next — or what to cut." },
    ],
    faqs: [
      {
        question: "How fast can an MVP actually ship?",
        answer: "Most MVPs take 6–10 weeks, scoped tightly around the one assumption that matters most for your idea.",
      },
      {
        question: "What gets cut to keep it an MVP?",
        answer:
          "Anything that isn't essential to testing your core hypothesis — polish, edge cases, and \"nice to haves\" wait until you know the idea works.",
      },
      {
        question: "What happens after the MVP launches?",
        answer:
          "We use real user feedback to decide what to build next, and can move straight into a full build or an ongoing support plan.",
      },
      {
        question: "Is an MVP good enough to show investors?",
        answer: "Yes — it's built to be a credible, working product, not a throwaway prototype.",
      },
    ],
    metricsColor: "#6D3FC7",
    metricsChart: "slope",
    metrics: [
      {
        label: "Time to first user test",
        before: "12 wks",
        after: "6 wks",
        beforePct: 100,
        afterPct: 50,
        benefit: "2x faster validation — real user feedback arrives while the idea is still cheap to change.",
      },
      {
        label: "Cost to validate an idea",
        before: "$50k",
        after: "$15k",
        beforePct: 100,
        afterPct: 30,
        benefit: "70% less spent before you know if it's worth building further.",
      },
      {
        label: "Features before launch",
        before: "40",
        after: "8",
        beforePct: 100,
        afterPct: 20,
        benefit: "A lean scope focused only on what proves the riskiest assumption.",
      },
    ],
  },
  {
    slug: "web-development",
    category: "Product Development",
    title: "Web Development",
    description: "From high-converting marketing websites to powerful internal platforms, we create fast, modern experiences.",
    image: "/web-devel-img.png",
    process: [
      { title: "Discovery & Sitemap", description: "Map the pages, content, and user journeys the site needs to support." },
      { title: "Design", description: "Build a clean, on-brand interface focused on conversion and clarity." },
      { title: "Development", description: "Build a fast, responsive site with clean, maintainable code." },
      { title: "QA & Performance", description: "Cross-browser, cross-device testing plus speed and SEO checks." },
      { title: "Launch & Support", description: "Go live with monitoring in place, and ongoing updates as your site grows." },
    ],
    faqs: [
      {
        question: "Will the site be optimized for search engines?",
        answer:
          "Yes — proper metadata, semantic markup, sitemaps, and performance are handled by default, not bolted on afterward.",
      },
      {
        question: "Can I update the content myself after launch?",
        answer: "If you need that, we'll set up a CMS or structured content system so updates don't require touching code.",
      },
      {
        question: "How do you handle mobile responsiveness?",
        answer: "Every site is built mobile-first and tested across real devices, not just resized browser windows.",
      },
      {
        question: "What platform do you build on?",
        answer: "Typically Next.js for performance and flexibility, though the right tool depends on what the site actually needs to do.",
      },
    ],
    metricsColor: "#0E9F8E",
    metricsChart: "grouped-bar",
    metrics: [
      {
        label: "Avg. page load time",
        before: "4.5s",
        after: "1.4s",
        beforePct: 100,
        afterPct: 31,
        benefit: "69% faster loads — visitors see a usable page before they think to leave.",
      },
      {
        label: "Mobile conversion rate",
        before: "1.2%",
        after: "3.8%",
        beforePct: 32,
        afterPct: 100,
        benefit: "3x more mobile visitors completing the action the page was built for.",
      },
      {
        label: "Lighthouse performance score",
        before: "52",
        after: "96",
        beforePct: 54,
        afterPct: 100,
        benefit: "A site that passes Core Web Vitals instead of fighting them.",
      },
    ],
  },
  {
    slug: "ui-ux-design",
    category: "Product Development",
    title: "UI & UX Design",
    description: "User research, information architecture, and interface design that make complex products feel simple.",
    image: "/ux-design.png",
    process: [
      { title: "Research", description: "Understand your users, their goals, and where the current experience breaks down." },
      { title: "Information Architecture", description: "Structure the product so every flow makes sense before a single screen is designed." },
      { title: "UI Design", description: "Design interfaces that are both usable and unmistakably yours." },
      { title: "Prototype & Test", description: "Validate the design with clickable prototypes before development starts." },
      { title: "Handoff", description: "Deliver production-ready files and specs your developers can build from directly." },
    ],
    faqs: [
      {
        question: "Do you design in Figma?",
        answer: "Yes — you'll get organized, well-structured Figma files your team (or ours) can build straight from.",
      },
      {
        question: "Will I get to test the design before development starts?",
        answer: "Yes — clickable prototypes let you and real users try the flow before a line of code gets written.",
      },
      {
        question: "Can you redesign an existing product instead of starting from scratch?",
        answer: "Absolutely — most of our UX work starts with an audit of what's already there before proposing changes.",
      },
      {
        question: "Do you also handle the development, or just the design?",
        answer: "Both, if you need it — or we can hand off polished, dev-ready files to your existing team.",
      },
    ],
    metricsColor: "#C23E85",
    metricsChart: "radial-gauge",
    metrics: [
      {
        label: "Task completion rate",
        before: "61%",
        after: "94%",
        beforePct: 65,
        afterPct: 100,
        benefit: "Most users now complete key flows on the first try, without help.",
      },
      {
        label: "Support tickets (confusion-related)",
        before: "40 / mo",
        after: "9 / mo",
        beforePct: 100,
        afterPct: 23,
        benefit: "77% fewer 'how do I...' tickets — the interface explains itself.",
      },
      {
        label: "Time to complete key flow",
        before: "3m 20s",
        after: "1m 05s",
        beforePct: 100,
        afterPct: 33,
        benefit: "3x faster task completion — fewer steps, clearer choices at each one.",
      },
    ],
  },
  {
    slug: "mobile-app-development",
    category: "Product Development",
    title: "Mobile App Development",
    description: "Native and cross-platform iOS and Android experiences that keep your business connected wherever work happens.",
    image: "/mobile-app-image.png",
    process: [
      { title: "Discovery & Planning", description: "Define the platforms, core features, and technical approach." },
      { title: "Design", description: "Design native-feeling interfaces for iOS and Android." },
      { title: "Build", description: "Develop the app with React Native or native tooling, depending on what the product needs." },
      { title: "Device Testing", description: "Test across real devices and OS versions, not just simulators." },
      { title: "Submission & Support", description: "Handle App Store and Play Store submission, then support you through updates." },
    ],
    faqs: [
      {
        question: "Native or cross-platform — which do you recommend?",
        answer:
          "Cross-platform (React Native) covers most cases well and ships faster; we'll recommend native only when the app genuinely needs it.",
      },
      {
        question: "Do you handle App Store and Play Store submission?",
        answer: "Yes — we manage the submission process and the recurring update cycle after launch.",
      },
      {
        question: "Can the app work offline?",
        answer: "Yes, when the product needs it — offline-first sync is something we've built before and can architect in from the start.",
      },
      {
        question: "How long does a typical app take to build?",
        answer: "Most native/cross-platform builds run 6–10 weeks depending on feature scope and platform count.",
      },
    ],
    metricsColor: "#B5680F",
    metricsChart: "bullet",
    metrics: [
      {
        label: "App crash rate",
        before: "4.1%",
        after: "0.3%",
        beforePct: 100,
        afterPct: 7,
        benefit: "93% fewer crashes — real device testing catches what simulators miss.",
      },
      {
        label: "App Store rating",
        before: "3.2★",
        after: "4.7★",
        beforePct: 68,
        afterPct: 100,
        benefit: "A store rating that helps installs instead of scaring them off.",
      },
      {
        label: "Session length",
        before: "1m 40s",
        after: "4m 20s",
        beforePct: 38,
        afterPct: 100,
        benefit: "2.6x longer sessions — people stay because the app actually works.",
      },
    ],
  },
  {
    slug: "legacy-code-refactoring",
    category: "Modernize & Maintain",
    title: "Legacy Code Refactoring",
    description: "Modernize ageing codebases for maintainability and performance without disrupting the business running on them.",
    image: "/code-refactory-image.png",
    process: [
      { title: "Audit the Codebase", description: "Identify the riskiest, most brittle parts of the system first." },
      { title: "Prioritize", description: "Rank refactoring work by business risk and effort, not just code smell." },
      { title: "Refactor Incrementally", description: "Improve the code in small, safe steps that never break production." },
      { title: "Regression Test", description: "Verify nothing that worked before stops working now." },
      { title: "Deploy Safely", description: "Ship changes with a rollback plan, so improvements never become incidents." },
    ],
    faqs: [
      {
        question: "Will refactoring break my production system?",
        answer:
          "No — changes are made incrementally with regression testing at every step, so the system keeps working throughout.",
      },
      {
        question: "How do you decide what to refactor first?",
        answer: "By business risk, not code aesthetics — the parts most likely to cause an outage or block new features go first.",
      },
      {
        question: "Do you need full access to our codebase?",
        answer: "Yes, along with context from whoever knows it best — access and a short handover call get us moving quickly.",
      },
      {
        question: "Can this run alongside active feature development?",
        answer: "Yes — refactoring is usually staged so your team can keep shipping features in parallel.",
      },
    ],
    metricsColor: "#4A3AA7",
    metricsChart: "arrow",
    metrics: [
      {
        label: "Build time",
        before: "18 min",
        after: "4 min",
        beforePct: 100,
        afterPct: 22,
        benefit: "78% faster builds — less time waiting, more time shipping.",
      },
      {
        label: "Production incidents / month",
        before: "9",
        after: "2",
        beforePct: 100,
        afterPct: 22,
        benefit: "Fewer surprises in production once brittle code paths get cleaned up.",
      },
      {
        label: "New feature lead time",
        before: "5 wks",
        after: "1.5 wks",
        beforePct: 100,
        afterPct: 30,
        benefit: "3x faster delivery — the codebase stops fighting every new feature.",
      },
    ],
  },
  {
    slug: "software-code-audit",
    category: "Modernize & Maintain",
    title: "Software Code Audit",
    description: "A thorough technical assessment of your codebase's quality, security, and scalability, with a clear action plan.",
    image: "/audit-img.png",
    process: [
      { title: "Technical Review", description: "Examine the codebase for architecture, quality, and maintainability issues." },
      { title: "Security & Performance Check", description: "Look for vulnerabilities, bottlenecks, and scalability risks." },
      { title: "Findings Report", description: "Document what's working, what's not, and why it matters." },
      { title: "Action Plan", description: "Prioritize a clear, practical roadmap for fixing what matters most." },
      { title: "Follow-Up Review", description: "Check back in after fixes ship to confirm the issues are actually resolved." },
    ],
    faqs: [
      {
        question: "What do I actually get at the end of the audit?",
        answer:
          "A written report covering code quality, security, and scalability, plus a prioritized action plan — not just a list of problems.",
      },
      {
        question: "How long does an audit take?",
        answer: "Most audits take 2–5 days depending on codebase size, with a follow-up review once fixes are underway.",
      },
      {
        question: "Is the audit specific to one language or framework?",
        answer: "No — we audit across common web and mobile stacks; let us know what you're running and we'll scope accordingly.",
      },
      {
        question: "Do you also implement the fixes?",
        answer: "We can, or hand the report to your team — whichever fits how you want to move forward.",
      },
    ],
    metricsColor: "#1B9159",
    metricsChart: "split-bar",
    metrics: [
      {
        label: "Avg. page load time",
        before: "4.2s",
        after: "1.6s",
        beforePct: 100,
        afterPct: 38,
        benefit: "62% faster page loads — trimmed bundles, optimized queries, and cached data where it counts.",
      },
      {
        label: "Critical bugs per month",
        before: "12",
        after: "3",
        beforePct: 100,
        afterPct: 25,
        benefit: "75% fewer critical bugs — the riskiest issues get caught in review, before they reach production.",
      },
      {
        label: "New engineer ramp-up time",
        before: "6 wks",
        after: "2 wks",
        beforePct: 100,
        afterPct: 33,
        benefit: "3x faster onboarding — a clean, documented codebase means new hires ship sooner.",
      },
    ],
  },
  {
    slug: "systems-integration",
    category: "Modernize & Maintain",
    title: "Systems Integration",
    description: "Connect the tools your business already relies on so data moves between them without manual work.",
    image: "/system-integration-image.png",
    process: [
      { title: "Map Current Systems", description: "Understand what tools you use today and how data is supposed to move between them." },
      { title: "Define Data Flow", description: "Design exactly what syncs, when, and in what direction." },
      { title: "Build the Integration", description: "Connect your tools with reliable, monitored data pipelines." },
      { title: "Test End-to-End", description: "Verify data moves correctly across every connected system." },
      { title: "Monitor & Support", description: "Keep an eye on the integration after launch and fix issues before you notice them." },
    ],
    faqs: [
      {
        question: "What kinds of tools can you connect?",
        answer: "Most systems with an API or webhook support — CRMs, payment processors, internal tools, and custom software alike.",
      },
      {
        question: "What happens if a connected system changes its API?",
        answer:
          "Integrations are built to be monitored, so breaking changes get caught and fixed before they cause silent data issues.",
      },
      {
        question: "Can data sync in real time?",
        answer: "Yes, when the source system supports it — otherwise we set up a sync interval that fits how the data is actually used.",
      },
      {
        question: "Do you handle authentication and security for the integration?",
        answer: "Yes — credentials and data in transit are handled following each platform's recommended security practices.",
      },
    ],
    metricsColor: "#0B84A5",
    metricsChart: "split-bar",
    metricsChartOrientation: "vertical",
    metrics: [
      {
        label: "Manual data entry / week",
        before: "15 hrs",
        after: "2 hrs",
        beforePct: 100,
        afterPct: 13,
        benefit: "87% less manual entry — data moves between systems on its own.",
      },
      {
        label: "Data sync errors / month",
        before: "22",
        after: "1",
        beforePct: 100,
        afterPct: 5,
        benefit: "Near-elimination of sync errors — one source of truth instead of copy-pasting between tools.",
      },
      {
        label: "Time to reconcile records",
        before: "3 days",
        after: "2 hrs",
        beforePct: 100,
        afterPct: 3,
        benefit: "Records that stay in sync automatically instead of a weekly reconciliation scramble.",
      },
    ],
  },
  {
    slug: "cloud-migration",
    category: "Modernize & Maintain",
    title: "Cloud Migration",
    description: "Move applications and data to the cloud with minimal downtime and a plan for cost and performance after launch.",
    image: "/cloude-migration-img.png",
    process: [
      { title: "Assess & Plan", description: "Audit your current environment and define a migration path with minimal downtime." },
      { title: "Prepare the Environment", description: "Set up the target cloud infrastructure before anything moves." },
      { title: "Migrate Workloads", description: "Move data and applications in a controlled, staged sequence." },
      { title: "Validate & Test", description: "Confirm everything works correctly in the new environment." },
      { title: "Optimize & Handover", description: "Tune for cost and performance, then hand over a fully documented setup." },
    ],
    faqs: [
      {
        question: "How much downtime should I expect?",
        answer: "Migrations are planned to minimize downtime, often to a small maintenance window rather than a full outage.",
      },
      {
        question: "Which cloud provider do you work with?",
        answer: "Most commonly AWS, Azure, and Vercel-hosted stacks — we'll recommend the right fit for your workload.",
      },
      {
        question: "Will this reduce our hosting costs?",
        answer: "Often, yes — part of the process includes reviewing usage and right-sizing infrastructure, not just lifting and shifting.",
      },
      {
        question: "What happens if something goes wrong during migration?",
        answer: "Every migration has a rollback plan, so we can revert to the original environment if something doesn't validate correctly.",
      },
    ],
    metricsColor: "#3F5B7A",
    metricsChart: "slope",
    metricsChartOrientation: "vertical",
    metrics: [
      {
        label: "Monthly infrastructure cost",
        before: "$8,400",
        after: "$3,100",
        beforePct: 100,
        afterPct: 37,
        benefit: "63% lower hosting cost — right-sized infrastructure instead of over-provisioned servers.",
      },
      {
        label: "Deployment time",
        before: "45 min",
        after: "6 min",
        beforePct: 100,
        afterPct: 13,
        benefit: "7.5x faster deploys — ship changes without a coffee-break wait.",
      },
      {
        label: "Uptime",
        before: "98.2%",
        after: "99.95%",
        beforePct: 98,
        afterPct: 100,
        benefit: "Hours of downtime a year instead of days.",
      },
    ],
  },
];

export function getExpertiseArea(slug: string) {
  return expertiseAreas.find((area) => area.slug === slug);
}

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
    image: "/azure-img.png",
  },
  {
    title: "eCommerce",
    description: "Storefronts, checkout flows, and back-office tools built to convert and scale.",
    image: "/nick/nick-front.jpg",
  },
  {
    title: "Education",
    description: "Learning management systems and platforms for course delivery and student engagement.",
    image: "/Education-image.png",
  },
  {
    title: "Retail",
    description: "Inventory, point-of-sale, and customer-facing systems for physical and online retail.",
    image: "/sas-image.png",
  },
  {
    title: "Media & Entertainment",
    description: "Content platforms and applications built for audience reach and engagement at scale.",
    image: "/media-img.png",
  },
  {
    title: "Human Resources",
    description: "Recruiting, onboarding, and workforce management tools that simplify HR operations.",
    image: "/ai-image.png",
  },
  {
    title: "Wellness & Fitness",
    description: "Mental health, fitness, and wellness apps designed around everyday habits and routines.",
    image: "/lotos/Screenshot-bialy-lotos-desktop-01.png",
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
  image?: string;
  imageAlt?: string;
  bio: string[];
  linkedin?: string;
};

export const founder: Founder = {
  name: "Olga",
  role: "Fullstack Developer & CEO",
  image: "/profile-olga_goryszewska_enodre-portfolio-image.png",
  imageAlt: "Portrait of Olga Goryszewska",
  bio: [
    "Olga is a Fullstack Developer and CEO who believes great software begins with understanding people, not just technology. With a background spanning UX strategy, product design, and modern web development, she helps businesses untangle complex workflows and turn them into intuitive digital experiences that are both elegant and practical.",
    "She specializes in designing dashboards, business applications, workflow automation, AI-powered solutions, and high-performance websites. Every project starts with one question: What's really slowing this business down? From there, she works closely with clients to uncover opportunities, simplify processes, and build software that delivers measurable results.",
    "Olga's approach is collaborative, detail-oriented, and focused on long-term value. Rather than building features for the sake of technology, she creates solutions that improve efficiency, reduce friction, and help businesses grow with confidence.",
    "Whether partnering with startups, growing companies, or enterprise teams, her goal remains the same: to design software that feels effortless to use and makes everyday work better.",
  ],
};

export const nick: Founder = {
  name: "Nick",
  role: "Technical Lead & CEO",
  image: "/nick-enodre.png",
  imageAlt: "Portrait of Nick Chaudhari",
  linkedin: "https://www.linkedin.com/in/nikhilesh-chaudhari/",
  bio: [
    "Nick is a Technical Lead and CEO with 9+ years of experience across startups, consultancies, and enterprise environments, with a track record of designing and shipping scalable full-stack platforms across SaaS, retail technology, cybersecurity, insurance, and sports tech.",
    "Most recently, he's led the architecture of an integrations platform and an agentic AI system for Australian accounting firms, building resilient, event-driven workflows with Python, Django, React, and AWS. Before that, he spent two years at Splunk as a Senior Forward Deployed Software Engineer, and three years at Kangatech scaling the KT360 sports-science platform as an early engineer.",
    "He's earned recognition along the way, including Splunk's MVP of the Year in 2024, and holds a Master of Information Technology from Monash University. Beyond the code, he's known for mentoring engineers and setting the standards — CI/CD, testing, observability — that keep platforms reliable as they scale.",
  ],
};

export const teamMembers: Founder[] = [founder, nick];

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
      "Node.js",
      "React JS",
      "Vue.js",
      "Ruby on Rails",
      "Python",
      "Shopify",
      "Django",
      ".NET",
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

export type Faq = {
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    question: "How can I start working with you?",
    answer:
      "Reach out through the contact form or book a short call. We'll talk through what you're trying to build, and within a day or two you'll have a clear next step — either a proposal for a defined project or a plan for an initial discovery workshop.",
  },
  {
    question: "Will I get an estimate before the project starts?",
    answer:
      "Yes. Once we understand the scope, you'll get a fixed price and timeline before any work begins — no open-ended hourly billing on project work. Most engagements land somewhere between a focused landing page (around $900) and a full product build spanning web, mobile, and backend (from $8,500).",
  },
  {
    question: "How will I receive updates on my project?",
    answer:
      "You'll have direct access to me throughout — no account managers relaying messages. Expect regular check-ins tied to each phase of the process (discovery, design, development, testing, release), plus a shared space to track progress in between.",
  },
  {
    question: "What if I'm not sure what kind of engagement I need?",
    answer:
      "That's normal, and it's exactly what the discovery call is for. If you have a clear project, we scope it as fixed-price work. If you need an ongoing partner for smaller improvements and support, a monthly plan usually fits better. We'll figure out which one together.",
  },
  {
    question: "Who will actually work on my project?",
    answer:
      "You'll work with a small, dedicated team. Olga, founder and fullstack developer, leads every project personally and stays hands-on from scoping to delivery — no rotating staff or handoffs to people you haven't met.",
  },
  {
    question: "What if the scope changes during development?",
    answer:
      "It happens often, and it's fine. Small adjustments get absorbed as we go. Anything that meaningfully expands the original scope gets discussed openly, with a clear estimate for the added work before it starts — no surprise invoices.",
  },
  {
    question: "Where are you based, and do you work with international clients?",
    answer:
      "Yes — clients so far have spanned Saudi Arabia, New Zealand, and beyond. Work happens remotely and asynchronously, with overlap windows scheduled for calls regardless of time zone.",
  },
  {
    question: "What if I'm not happy with the first results?",
    answer:
      "We review work together at the end of each phase, so misalignment gets caught early rather than at the finish line. If something isn't landing, we revise it as part of that phase — the goal is a product you're genuinely happy to ship.",
  },
  {
    question: "How do you handle IP and confidentiality?",
    answer:
      "Everything built for you is yours — code, designs, and content. An NDA is standard practice for any project involving sensitive business information, and it's signed before any detailed discussion begins.",
  },
  {
    question: "Can we start small and scale up later?",
    answer:
      "Yes — that's a common path. Plenty of projects begin as a discovery workshop or a single feature, then grow into a full product once the direction is validated. Monthly partnership plans also flex up or down as your needs change.",
  },
  {
    question: "Do you offer support after launch?",
    answer:
      "Yes. Launch isn't the end of the process — it's followed by a support phase, and most clients move into an ongoing monthly plan for fixes, small features, and improvements as real usage surfaces new needs.",
  },
];

export const technologies: string[] = [
  "Node.js",
  "React JS",
  "Vue.js",
  "Ruby on Rails",
  "Python",
  "Shopify",
  "Django",
  ".NET",
];
