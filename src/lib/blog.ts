import { founder, nick, type Founder } from "@/lib/content";

export type BlogContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attribution: string }
  | { type: "stats"; items: { value: string; label: string; detail: string }[] };

export type BlogSource = { label: string; publisher: string; url: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  readTime: string;
  author: Founder;
  coverVariant: "code-debt" | "cloud-cost";
  body: BlogContentBlock[];
  sources: BlogSource[];
  relatedServiceSlugs: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "ai-generated-code-technical-debt",
    title: "AI-Generated Code and Technical Debt: What the 2026 Data Actually Shows",
    description:
      "AI now writes or assists with 61% of the average enterprise codebase, but 81% of leaders report more production issues because of it. Here's what 2026 research shows about AI-generated code, technical debt, and security risk — and what actually works to manage it.",
    category: "Software Quality",
    publishedAt: "2026-09-25",
    readTime: "8 min read",
    author: founder,
    coverVariant: "code-debt",
    relatedServiceSlugs: ["software-code-audit", "legacy-code-refactoring"],
    body: [
      {
        type: "paragraph",
        text: "In 2026, AI writes or assists with an estimated 61% of the average enterprise codebase, according to CloudBees' State of Code Abundance Report. Adoption isn't really the question anymore — most engineering teams have already said yes to Copilot, Cursor, Claude, or some mix of the three. The question worth asking now is what happens to that code six months after it ships.",
      },
      {
        type: "paragraph",
        text: "The same report surfaces what it calls a confidence gap: 92% of engineering leaders say they're confident their AI-generated code is production-ready, while 81% of those same leaders report an increase in production issues tied directly to AI-generated code. Both numbers are true at once, inside the same organizations. As one analyst quoted in the report put it, teams are discovering that writing code was never really the bottleneck.",
      },
      {
        type: "quote",
        text: "Writing code is no longer the primary bottleneck. Governing it is.",
        attribution: "CloudBees, 2026 State of Code Abundance Report",
      },
      {
        type: "heading",
        text: "What happens when you actually audit AI-written code",
      },
      {
        type: "paragraph",
        text: "“Debt Behind the AI Boom,” a large-scale empirical study published on arXiv, is the closest thing we have to a direct answer. Researchers tracked 302,579 verified AI-authored commits across 6,299 public GitHub repositories (each with at least 100 stars), covering five widely used assistants — GitHub Copilot, Claude, Cursor, Gemini, and Devin — across Python, JavaScript, and TypeScript. They ran static analysis on every AI commit, then followed each introduced issue forward to see whether it was ever fixed.",
      },
      {
        type: "stats",
        items: [
          { value: "484,366", label: "issues identified", detail: "Distinct problems introduced directly by AI-authored commits across the study." },
          { value: "17–29%", label: "of commits introduce an issue", detail: "Every one of the five assistants studied crossed this range — Copilot at the low end, Gemini at the high end." },
          { value: "22.7%", label: "of issues never get fixed", detail: "Still present at the latest version of the repo — some introduced 9+ months earlier." },
        ],
      },
      {
        type: "paragraph",
        text: "The breakdown of those 484,366 issues is the part worth sitting with: 89.3% were code smells (duplication, poor structure, needless complexity), 6.0% were correctness bugs, and 4.7% were security issues. On its own, a code smell doesn't crash anything. But at this volume, and with more than a fifth of them never getting cleaned up, they compound — into the kind of codebase where every new feature takes longer to ship than the last, for reasons nobody can quite point to. That's technical debt in its plainest form.",
      },
      {
        type: "heading",
        text: "The security numbers are worse than the debt numbers",
      },
      {
        type: "paragraph",
        text: "Veracode's 2026 GenAI Code Security Report tested over 100 models and found an average security pass rate of just 56% — barely moved from 55% the year before, despite every one of those models getting measurably better at writing code that runs. Roughly 44% of AI code-generation tasks introduced a risky vulnerability. Even the best-performing model in the mid-2026 dataset, GPT-5.5, still failed close to a third of its security tests. For Java specifically, the mean pass rate was 30%.",
      },
      {
        type: "stats",
        items: [
          { value: "56%", label: "security pass rate", detail: "Average across 100+ models tested by Veracode — up 1 point from the year before." },
          { value: "44%", label: "of tasks introduce a risky flaw", detail: "The share of AI code-generation tasks in Veracode's benchmark that produced an exploitable vulnerability." },
          { value: "30%", label: "Java pass rate", detail: "The lowest-scoring language in Veracode's 2026 benchmark." },
        ],
      },
      {
        type: "paragraph",
        text: "A separate academic study of real-world “vibe-coded” applications — built largely by prompting rather than hand-writing code — analyzed 1,186 vulnerabilities across live, publicly deployed apps. 91% of the applications contained at least one vulnerability, and 65.77% of those findings were rated Critical or High severity. This isn't a lab benchmark; these were shipped products.",
      },
      {
        type: "paragraph",
        text: "There's a subtler risk underneath both of those numbers: package hallucination. A USENIX Security 2025 study generated 2.23 million code samples across 16 models and found that 19.7% referenced at least one package that doesn't exist. Worse, when researchers reran identical prompts ten times, 43% of those hallucinated names came back every single time — predictable enough that an attacker can pre-register the exact name on a public package registry and wait. Security researchers now call this slopsquatting, and it's a direct, repeatable supply-chain attack surface that didn't exist three years ago.",
      },
      {
        type: "heading",
        text: "Why this becomes debt, not just a bug backlog",
      },
      {
        type: "paragraph",
        text: "The 22.7% persistence rate from the “Debt Behind the AI Boom” study is the number that matters most for planning purposes. It's not that AI-introduced issues are unusually hard to fix — most are ordinary code smells a human reviewer would catch in minutes. It's that nobody's catching them, because review capacity hasn't scaled anywhere near as fast as code volume has. When a team is shipping 60%+ of its codebase with AI assistance and reviewing it at the same headcount as two years ago, the gap doesn't stay a bug list. It becomes the baseline the next feature gets built on top of.",
      },
      {
        type: "heading",
        text: "What actually works",
      },
      {
        type: "list",
        items: [
          "Treat AI-generated code like a junior engineer's pull request — reviewed and tested every time, never merged on trust.",
          "Run a full code audit before scaling a fast-shipped MVP or prototype into something customers depend on.",
          "Prioritize refactoring passes specifically on code that shipped fastest under deadline pressure — it's disproportionately where debt hides.",
          "Add automated security scanning to your pipeline; human review alone doesn't scale to the volume AI tools now generate.",
          "Audit your dependency tree for packages that only ever appeared because a model suggested them — check they're real, maintained, and intentional.",
        ],
      },
      {
        type: "paragraph",
        text: "None of this is an argument against using AI to write code — the productivity gains are real, and most of the industry has already made that call. It's an argument for treating the output the way you'd treat output from any fast, prolific contributor who's never seen your codebase's history: useful, but unverified until someone checks it. That's the gap our Software Code Audit and Legacy Code Refactoring work sits in — going through what's already shipped, finding what's quietly become debt, and fixing it before it's load-bearing.",
      },
    ],
    sources: [
      {
        label: "Debt Behind the AI Boom: A Large-Scale Empirical Study of AI-Generated Code in the Wild",
        publisher: "arXiv",
        url: "https://arxiv.org/html/2603.28592v2",
      },
      {
        label: "2026 GenAI Code Security Report",
        publisher: "Veracode",
        url: "https://www.veracode.com/resources/analyst-reports/2026-genai-code-security-report/",
      },
      {
        label: "2026 State of Code Abundance Report",
        publisher: "CloudBees",
        url: "https://www.cloudbees.com/blog/2026-state-of-code-abundance-report",
      },
      {
        label: "Understanding the (In)Security of Vibe-Coded Applications",
        publisher: "arXiv",
        url: "https://arxiv.org/html/2606.23130",
      },
      {
        label: "We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs",
        publisher: "USENIX Security 2025",
        url: "https://www.usenix.org/system/files/usenixsecurity25-spracklen.pdf",
      },
    ],
  },
  {
    slug: "cloud-repatriation-2026",
    title: "Cloud Repatriation in 2026: What the Data Actually Shows (and What It Doesn't)",
    description:
      "Headlines say 86% of CIOs are abandoning the cloud. The real numbers from Barclays, IDC, and Gartner tell a narrower, more useful story. Here's what actually drives cloud repatriation, and how to tell if it applies to your infrastructure.",
    category: "Cloud & Infrastructure",
    publishedAt: "2026-09-18",
    readTime: "7 min read",
    author: nick,
    coverVariant: "cloud-cost",
    relatedServiceSlugs: ["cloud-migration", "systems-integration"],
    body: [
      {
        type: "paragraph",
        text: "You've probably seen the headline version of this by now: some variation of “86% of CIOs are pulling workloads out of the cloud,” often dressed up further into “the great cloud exodus of 2026.” It's the kind of stat that's technically sourced and functionally misleading at the same time — real survey, real number, wrong takeaway. The actual data, once you trace it back, describes something much narrower and much more useful: companies getting more deliberate about which workloads belong where, not a retreat from the cloud.",
      },
      {
        type: "heading",
        text: "What the 86% headline doesn't tell you",
      },
      {
        type: "paragraph",
        text: "The number comes from a Barclays CIO Survey (Q4 2024), which asked CIOs whether their organization planned to move any workload from public cloud back to private or on-premises infrastructure. 83–86% said yes, depending on which write-up you read — the highest rate Barclays has recorded. The problem, as industry analyst Larry Walsh pointed out plainly, is that the question doesn't distinguish scale: “if 83% of enterprises decide to move one workload from the public cloud to their local infrastructure, the number remains true.” A company relocating a single logging service and a company exiting the cloud entirely both answer “yes,” and both get counted the same way.",
      },
      {
        type: "paragraph",
        text: "IDC's independent research fills in the gap the headline leaves out. In IDC's “Assessing the Scale of Workload Repatriation,” roughly 80% of respondents expected some repatriation of compute or storage within 12 months — consistent with the Barclays number. But less than 10% reported repatriating an entire workload. The overwhelming majority were moving specific, targeted pieces: a database here, an AI inference pipeline there.",
      },
      {
        type: "stats",
        items: [
          { value: "~80%", label: "expect some repatriation", detail: "Barclays and IDC surveys agree closely on this figure, measured over a 12-month window." },
          { value: "<10%", label: "repatriate an entire workload", detail: "IDC's research shows the overwhelming majority of moves are targeted, not wholesale exits." },
          { value: "$723.4B", label: "in 2025 public cloud spend", detail: "Gartner's forecast — up 21.5% year-over-year. The market is still growing while this conversation happens." },
        ],
      },
      {
        type: "heading",
        text: "The market is still growing — just not evenly",
      },
      {
        type: "paragraph",
        text: "That last figure is worth sitting with. Gartner forecasts worldwide public cloud end-user spending to reach $723.4 billion in 2025, up from $595.7 billion the year before — a 21.5% increase, in the same period this repatriation narrative was building. Both things are true: enterprises are pulling specific workloads back, and overall cloud spend keeps climbing, because new workloads (a lot of them AI-driven) are being created faster than old ones are being repatriated. Gartner separately predicts that over 40% of leading enterprises will have adopted hybrid computing architectures for mission-critical workflows by 2028, up from around 8% today. Read together, these aren't contradictory — they describe a shift from “cloud by default” to “cloud by workload,” where the placement decision gets made deliberately instead of inherited from whatever the original migration plan assumed.",
      },
      {
        type: "heading",
        text: "Where repatriation actually makes sense",
      },
      {
        type: "paragraph",
        text: "When IDC and Barclays asked what's actually driving the decisions behind that ~80%, the answers cluster around three things: cost (cited by 54% of respondents), performance (31%), and data sovereignty or compliance (27%). None of these are new concerns — what's changed is the workload profile. Steady-state, predictable compute (the kind that runs 24/7 at a known volume) is exactly where hyperscaler pricing stops being a good deal, because you're paying an elasticity premium for elasticity you're not using. AI training and inference workloads sharpen this further: they're GPU-intensive and latency-sensitive, which is precisely the profile where dedicated infrastructure starts to pencil out cheaper than renting by the hour.",
      },
      {
        type: "heading",
        text: "What it looks like in practice: GEICO's decade-long lesson",
      },
      {
        type: "paragraph",
        text: "GEICO's story is the most concrete public example of this pattern. Starting in 2013, the company spent roughly a decade migrating over 600 applications to the public cloud. By its own account, the bill didn't shrink — it grew 2.5x, driven heavily by storage and data retrieval costs, while reliability suffered from data being spread across multiple vendors. GEICO is now repatriating workloads onto a private cloud built on OpenStack and Kubernetes, consolidating those 600+ legacy systems toward roughly 15–16.",
      },
      {
        type: "quote",
        text: "We have a lot of data — and it turns out that storage in the cloud is one of the most expensive things you can do in the cloud.",
        attribution: "Rebecca Weekly, VP of Platform and Infrastructure Engineering, GEICO",
      },
      {
        type: "paragraph",
        text: "That's not a story about the cloud failing as a concept — GEICO used it for a decade and it did what it was supposed to do early on. It's a story about a workload profile (large, steady, storage-heavy) outgrowing the pricing model it was placed under, and nobody revisiting that placement for ten years.",
      },
      {
        type: "heading",
        text: "So — should you repatriate?",
      },
      {
        type: "list",
        items: [
          "Break your cloud bill down by workload, not by total spend — the aggregate number hides which specific services are actually expensive.",
          "Flag steady-state, predictable-volume workloads first; they're the most common repatriation candidates because you're not paying for elasticity you don't use.",
          "Model the full cost of moving data out, not just compute — egress and exfiltration fees are frequently where the real savings (or the real trap) hide.",
          "Check data residency and compliance requirements before anything else; for regulated industries, this can override the cost math entirely.",
          "Treat this as an ongoing workload-placement decision, not a one-time migration — the right answer for a given service can change as its usage pattern matures.",
        ],
      },
      {
        type: "paragraph",
        text: "This is exactly the kind of decision that benefits from an outside, workload-by-workload audit rather than a wholesale migration project in either direction. Our Cloud Migration and Systems Integration work is built around that: modeling what a given workload actually costs where it lives now, what it would cost elsewhere, and architecting the hybrid setup in between — rather than treating “cloud” or “on-prem” as an all-or-nothing choice.",
      },
    ],
    sources: [
      {
        label: "Breaking Down the 83% Public Cloud Repatriation Number",
        publisher: "Channelnomics",
        url: "https://channelnomics.com/breaking-down-the-83-public-cloud-repatriation-number/",
      },
      {
        label: "The Great Repatriation? IT Leaders Reset Cloud Strategies to Optimize Value",
        publisher: "CIO",
        url: "https://www.cio.com/article/2520890/the-great-repatriation-it-leaders-reset-cloud-strategies-to-optimize-value.html",
      },
      {
        label: "Gartner Forecasts Worldwide Public Cloud End-User Spending to Total $723 Billion in 2025",
        publisher: "Gartner",
        url: "https://www.gartner.com/en/newsroom/press-releases/2024-11-19-gartner-forecasts-worldwide-public-cloud-end-user-spending-to-total-723-billion-dollars-in-2025",
      },
      {
        label: "Gartner Identifies the Top Strategic Technology Trends for 2026",
        publisher: "Gartner",
        url: "https://www.gartner.com/en/newsroom/press-releases/2025-10-20-gartner-identifies-the-top-strategic-technology-trends-for-2026",
      },
      {
        label: "Warren Buffett's GEICO Repatriates Work from the Cloud",
        publisher: "The Stack",
        url: "https://www.thestack.technology/warren-buffetts-geico-repatriates-work-from-the-cloud-continues-ambitious-infrastructure-overhaul/",
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
