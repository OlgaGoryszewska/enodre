# Job sources, machine access, keywords and red flags for a PMU / micropigmentation artist job agent

Research date: 2026-11-05. About 22 tool calls. Several boards (Bayt, InfoJobs, Pracuj.pl) blocked automated fetches with HTTP 403/456, so their result counts are unverified. Where only third-party or vendor sources were found, this is flagged.

## 1. Which job boards carry beauty/PMU jobs in each market, and how can a cheap agent read each one?

### Takeaway
Only two sources in scope are confirmed to have a free, official, documented job-search API: NAV's pam-stilling-feed (Norway) and Adzuna (which, per unofficial sources, covers Spain and Poland but not the GCC or Norway). Jooble has an API that requires a key request and has GCC subdomains, but keyword search there returns mostly noise. The large GCC boards (Bayt, Naukrigulf, GulfTalent, Dubizzle), Indeed and LinkedIn offer no public read API. In practice the agent reads them through email job alerts in Gmail, or through scraping, which is fragile and likely forbidden by their terms.

### Cited Findings
**Norway: NAV arbeidsplassen (official, free)**
- NAV's job vacancy feed: "Anyone can use this API free of charge" if you accept the terms of use. Endpoint `GET https://pam-stilling-feed.nav.no/api/v1/feed`, bearer-token auth. — [NAV Job Vacancy Feed](https://navikt.github.io/pam-stilling-feed)
- A public test token is served at `https://pam-stilling-feed.nav.no/api/publicToken` and "will rotate at irregular intervals". For a stable private token, email nav.team.arbeidsplassen@nav.no with a company identifier, contact details and written acceptance of the terms (terms at arbeidsplassen.nav.no/vilkar-api). — [NAV Job Vacancy Feed](https://navikt.github.io/pam-stilling-feed)
- Feed fields include title, content_text, employer, workLocations, applicationUrl, applicationDue, engagementtype, extent, occupationCategories (level1/level2) and categoryList. ETag/If-Modified-Since polling is supported. Under the terms, an ad must be removed from your service once it is marked INACTIVE. No rate limit is published. The sample client sleeps 2 minutes at the end of the feed. — [NAV Job Vacancy Feed](https://navikt.github.io/pam-stilling-feed)
- The older `pam-public-feed` (`/public-feed/api/v1/ads`) is limited to the 5,000 most recent ads when unfiltered. It has public and private tokens, with private tokens requested from plattform.for.arbeidsmarkedet@nav.no. — [navikt/pam-public-feed](https://github.com/navikt/pam-public-feed)
- The feed is a firehose with no keyword search. The agent has to download everything and filter locally on title and content_text (inferred from the endpoint design in the docs above).
- I found no current Norwegian PMU listing. The only near hit was a "Clinical Beauty Therapist" at La Bella AS, Lillestrøm, posted through NAV EURES and now closed (aggregator copy). — [jobsearch.dk](https://www.jobsearch.dk/frisoer/frederiksberg/3497731)

**Adzuna (official API, free key)**
- Search endpoint pattern: `https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id=&app_key=&what=&where=&what_exclude=&results_per_page=`. The overview and search docs pages publish no country list or rate limits. — [Adzuna developer overview](https://developer.adzuna.com/overview), [Adzuna search docs](https://developer.adzuna.com/docs/search)
- Unofficial lists of supported countries: gb, us, ca, au, de, fr, es, it, nl, at, be, br, in, mx, nz, pl, sg, za. Spain and Poland are included. UAE, Saudi Arabia, Qatar and Norway are not. One SDK README says "19 supported countries" without listing them, and another source says 16. No official list was found. — [Apify Adzuna actor README](https://apify.com/nabeelbaghoor/adzuna-job-search-api.md), [adzuna-sdk README](https://cdn.jsdelivr.net/npm/adzuna-sdk@0.1.2/README.md), [JobsPipe vs Adzuna](https://jobspipe.dev/alternatives/adzuna.md)
- UNVERIFIED: Adzuna's free-tier rate limits and terms of service (developer.adzuna.com/docs/terms_of_service was not fetched).

**Jooble (API on request; GCC subdomains exist)**
- The Jooble REST API is aimed at "webmasters of an internet portal or search engine". The key is requested via a form (name, position, email, website, phone). The page lists no cost, limits or country list. — [Jooble API](https://jooble.org/api/about)
- Jooble runs GCC subdomains (ae.jooble.org, sa.jooble.org). On ae.jooble.org, "permanent makeup" returned **211 vacancies**, but **none of the first 20 was a PMU, microblading or brow role**. Hits came from "permanent" (contract type) and "makeup" (Sephora, Carolina Herrera, Huda Beauty corporate roles, inspectors). Closest matches: "Beautician / SPA Therapist" and "All Around Beautician / Qatar" from Career Land Center LLC. — [ae.jooble.org/jobs-permanent-makeup](https://ae.jooble.org/jobs-permanent-makeup)
- sa.jooble.org "microblading": **0 results**. — [sa.jooble.org/jobs-microblading](https://sa.jooble.org/jobs-microblading)
- es.jooble.org "micropigmentación": **1 result**, a Cronoshare.com Madrid quote request for brow micropigmentation (a customer service request, not a job). — [es.jooble.org](https://es.jooble.org/trabajo-micropigmentaci%C3%B3n)
- pl.jooble.org "makijaż permanentny": 20 listings shown, most unrelated (Philip Morris, ABB, Umicore). Salon listings use "Linergistka", "KOSMETYCZKA-MAKIJAŻYSTKA", "stylizacja brwi i rzęs" and "stylistkę rzęs". — [pl.jooble.org](https://pl.jooble.org/praca-makija%C5%BC-permanentny)
- Jooble search pages show "Get new jobs by email", so email alerts exist. — [ae.jooble.org/jobs-permanent-makeup/Dubai](https://ae.jooble.org/jobs-permanent-makeup/Dubai)

**Indeed (all markets): no read API**
- Indeed's publisher job-search API has been shut down. Sources disagree on the date (2020 vs 2023), and neither cites an Indeed notice. The remaining publisher widget is display-only. — [JobsPikr](https://www.jobspikr.com/?p=31442), [JobsPipe on Indeed publisher API](https://jobspipe.dev/blog/indeed-publisher-api.md)
- An SAP KB says single-source XML job feeds to Indeed are discontinued from 31 March 2026. This concerns employer-to-Indeed feeds and is not a search API. — [SAP KB 3717428](https://userapps.support.sap.com/sap/support/knowledge/en/3717428)
- ae.indeed.com carries Dubai makeup listings, including SPMU trainer/artist salary entries. — [Indeed AE Makeup jobs in Dubai](https://ae.indeed.com/Makeup-jobs-in-Dubai)
- UNVERIFIED: whether Indeed RSS (`/rss?q=`) still works in 2026. No source confirmed it either way.

**GCC boards (Bayt, Naukrigulf, GulfTalent, Dubizzle, Qureos, MNC Jobs Gulf)**
- Bayt returned HTTP 403 to an automated fetch of its UAE permanent-makeup page. — [bayt.com](https://www.bayt.com/en/uae/jobs/permanent-makeup-artist-jobs/) (fetch attempt)
- Bayt's own terms were not found. Only third-party Apify scrapers exist, which proves scraping happens but not that it is allowed. — [Apify Bayt scraper](https://apify.com/jungle_synthesizer/bayt-jobs-scraper)
- Naukrigulf has a "Makeup Artist Jobs in Dubai" listing page. The PMU page timed out on fetch. — [Naukrigulf](https://www.naukrigulf.com/makeup-artist-jobs-in-dubai)
- GulfTalent carries makeup-artist roles (the example found was closed). — [GulfTalent](https://www.gulftalent.com/uae/jobs/make-up-artist-185125)
- Qureos has a real Dubai PMU listing: "Ladies Beauty Salon in Dubai Jumeirah is hiring a female PMU makeup artist with DHA license" (microblading, lip blush, eyeliner). — [Qureos](https://app.qureos.com/jobs/permanant-make-up-artist-microblading-lip-blush-eyeliner-1758139923996)
- MNC Jobs Gulf: "SPMU Artist and Beautician with Sales Expertise (British nationals based in Dubai)". — [mncjobsgulf.com](https://mncjobsgulf.com/jobs/spmu-artist-and-beautician-with-sales-expertise-british-nationals-based-in-dubai-dubai-1794847)
- Eurostaffs: "DHA licensed Semi-permanent and microblading Artist" at Hamzafied Beauty Salon. — [eurostaffs.org](https://eurostaffs.org/job/dha-licensed-semi-permanent-and-microblading-artist-hamzafied-beauty-salon)
- Brand careers sites (e.g. Alshaya for NYX "Makeup Artist – UAE") carry general makeup roles, not PMU. — [Alshaya](https://jobsearch.alshaya.com/mob/cau/en/job/594714)

**Spain: InfoJobs**
- Unofficial wrapper README: you need an account on the InfoJobs developer site, offer search supports `q` (keyword), province and company, and the default is 20 results per query. Official docs (developer.infojobs.net) were not fetched. — [infojobs npm](https://npmjs.com/package/infojobs)
- InfoJobs returned HTTP 456 (bot block) to an automated fetch of /ofertas-trabajo/micropigmentacion, so no result count is available. — [infojobs.net](https://www.infojobs.net/ofertas-trabajo/micropigmentacion) (fetch attempt)

**Poland: Pracuj.pl**
- Returned HTTP 403 to an automated fetch, so no count is available. — [pracuj.pl](https://www.pracuj.pl/praca/makijaz%20permanentny;kw) (fetch attempt)

### Inferences
- Lowest-cost architecture: (a) poll NAV pam-stilling-feed and filter locally; (b) call the Adzuna API for es and pl; (c) for the GCC, LinkedIn, Indeed, Bayt, Naukrigulf, GulfTalent, Dubizzle, FINN, InfoJobs and Pracuj, set up saved-search email alerts on each site and parse them from a Gmail label. This avoids scraping and ToS risk. (d) Optionally use a Jooble API key for ae/sa/qa with strict local filtering.
- The 403/456 responses from Bayt, InfoJobs and Pracuj suggest that direct scraping from a serverless cron would be blocked often.
- PMU volume on boards is very low. Even with keyword hits, expect a handful of real PMU ads per month per GCC market, so precise filtering matters more than recall.

### Gaps
- No verified result counts for Bayt, Naukrigulf, GulfTalent, Dubizzle, Indeed (ae/sa/qa), LinkedIn, Glassdoor, FINN, InfoJobs or Pracuj/OLX (fetches blocked or not attempted).
- Not verified: Adzuna's official country list, rate limits or ToS, and Jooble's limits, cost or country coverage.
- Not verified: Bayt/Naukrigulf/GulfTalent/LinkedIn ToS wording on scraping, and whether each sends email alerts (Bayt/Naukrigulf/LinkedIn/Indeed alerts are widely known to exist, but no source was fetched).
- No checks were done for Qatar or Saudi on specific boards beyond Jooble SA.
- FINN.no and OLX Praca were not researched.

## 2. How much PMU hiring happens off job boards, and is any of it machine-readable?

### Takeaway
I found no quantitative data. Job ads themselves show that Instagram portfolios and WhatsApp applications are the norm in Dubai beauty hiring. None of these channels is cheaply machine-readable in a ToS-compliant way.

### Cited Findings
- Dubai salon ads ask applicants to "submit your CV and Instagram portfolio", and a JLT lash/nail salon asks for "portfolio/Instagram of your work via WhatsApp". — search-result excerpts of [Qureos senior makeup artist](https://app.qureos.com/jobs/senior-makeup-artist-luxury-beauty-salon-1776248567037) and [Qureos master lash nail artist](https://app.qureos.com/jobs/master-lash-nail-artist-1755872417264)
- Some luxury salons state "Candidates without Dubai salon experience will NOT be reviewed." — [Qureos](https://app.qureos.com/jobs/senior-makeup-artist-luxury-beauty-salon-1776248567037)
- Recruitment agencies such as Career Land Center LLC post beauty roles for Qatar and Dubai across aggregators. — [ae.jooble.org](https://ae.jooble.org/jobs-permanent-makeup)

### Inferences
- Instagram, Facebook groups, WhatsApp and Telegram hiring posts are not accessible through cheap official APIs for third-party search. Meta's APIs do not allow keyword search of other accounts' posts, but that is my general knowledge and was not verified in this session. Treat these channels as manual or out of scope for the agent.
- Salon careers pages and Fresha salon listings could serve as a target list for direct outreach, not as a job feed.

### Gaps
- No source measured the share of PMU hiring that happens off job boards.
- No beauty-industry article on how PMU artists find jobs in Dubai was found.

## 3. Matching keywords and false friends

### Takeaway
Match on technique words (microblading, micropigmentation, PMU/SPMU, lip blush, powder brows, eyeliner tattoo, SMP, areola) rather than "makeup" or "permanent". "Permanent" alone matches contract type ("permanent position"), and "makeup" alone matches retail and bridal makeup. This was confirmed empirically on Jooble AE, where 211 hits contained 0 PMU roles.

### Cited Findings
- Real ad titles and phrasing seen: "PMU makeup artist with DHA license (microblading, lip blush, eyeliner)" ([Qureos](https://app.qureos.com/jobs/permanant-make-up-artist-microblading-lip-blush-eyeliner-1758139923996)); "Semi Permanent Makeup and Brow Grooming Artist" (Brau, per search excerpt); "SPMU Artist and Beautician" ([MNC Jobs Gulf](https://mncjobsgulf.com/jobs/spmu-artist-and-beautician-with-sales-expertise-british-nationals-based-in-dubai-dubai-1794847)); "DHA licensed Semi-permanent and microblading Artist" ([Eurostaffs](https://eurostaffs.org/job/dha-licensed-semi-permanent-and-microblading-artist-hamzafied-beauty-salon)); "Semi-Permanent Makeup (SPMU) Trainer" ([Indeed AE](https://ae.indeed.com/Makeup-jobs-in-Dubai)). Note that the Qureos ad misspells "permanant", so fuzzy matching helps.
- Polish salon ads use "Linergistka", "KOSMETYCZKA-MAKIJAŻYSTKA", "stylizacja brwi i rzęs", "stylistka rzęs", "wizażystka" and "stylistki paznokci". — [pl.jooble.org](https://pl.jooble.org/praca-makija%C5%BC-permanentny)
- False positives observed for "permanent makeup" on Jooble AE: Sephora Store Manager/FP&A, Carolina Herrera HR, Huda Beauty marketing director, Chalhoub YSL Beauty Consultant, engineering inspectors. — [ae.jooble.org](https://ae.jooble.org/jobs-permanent-makeup)
- A "DHA license" requirement is a strong positive signal for genuine Dubai PMU roles. Commercial sources say microblading/SPMU needs DHA approval and individual practitioner registration, but one source points to DET/Dubai Municipality instead, so this is not confirmed with DHA. — [DIAC](https://diac.ae/blog/beauty-salon-business-dubai-uae/), [businessdubai.ae](https://www.businessdubai.ae/blogs/aesthetic-clinic-setup-dubai), [rizmona](https://www.rizmona.com/licenses/make-up-artist-license/)

**Suggested keyword lists.** These are compiled from the ads above plus language knowledge. Terms not seen in a live ad are marked (unverified in ads).
- Strong positives, any language: microblading, microshading, nanoblading, ombre/powder brows, lip blush, lip blushing, eyeliner tattoo, PMU, SPMU, permanent makeup artist, semi-permanent makeup, micropigmentation, scalp micropigmentation / SMP, areola tattoo / areola micropigmentation, paramedical tattoo, medical tattoo, cosmetic tattoo, brow tattoo.
- English titles: PMU artist, SPMU artist, permanent makeup artist, micropigmentation specialist, microblading artist, brow artist (medium; needs a technique word in the body), lash and brow technician (medium; often lamination/tint only), SMP technician, PMU trainer.
- Arabic (unverified in ads): مكياج دائم / مكياج شبه دائم / تاتو حواجب / رسم حواجب / مايكروبليدنج / مايكروبليدينج / تصبغ دقيق / فني حواجب.
- Norwegian (unverified in ads): permanent makeup, PMU, PMU-artist, microblading, kosmetisk tatovering, bryn (bryn og vipper / vippe og bryn as medium), kosmetolog / hudterapeut (weak; general beauty therapist).
- Spanish (unverified on boards; Jooble returned only one non-job): micropigmentación, micropigmentadora/micropigmentador, maquillaje permanente, microblading, técnica en micropigmentación, dermopigmentación, micropigmentación capilar, micropigmentación oncológica/paramédica.
- Polish: makijaż permanentny, linergistka (seen), linergista, mikropigmentacja, microblading, stylistka brwi / stylizacja brwi (seen as "stylizacja brwi i rzęs"; medium), kosmetolog (weak).

**False friends (exclude unless a strong positive is also present):** makeup artist / MUA / bridal makeup / wizażystka / maquilladora; beauty consultant / beauty advisor (retail counters); nail technician / stylistka paznokci; lash technician / stylistka rzęs (extensions only); receptionist / salon coordinator; beautician / kosmetyczka / spa therapist (general); "permanent" as contract type (fast stilling, contrato indefinido, umowa o pracę na stałe); hairstylist; tattoo artist (body tattoo, unless cosmetic or paramedical); trainer/academy roles that are actually course sales; client-side "presupuesto para micropigmentación" quote requests (Cronoshare); recruiter roles at beauty agencies.

### Inferences
- Use two-tier scoring. Require at least one strong-positive technique term in the title or description. Boost for "DHA license" in Dubai, "certified", or portfolio requests. Down-rank or exclude when only "makeup" or "permanent" matches.

### Gaps
- None of the Arabic, Norwegian or Spanish terms was observed in a live job ad this session.

## 4. Red flags for beauty job ads in the GCC and Europe

### Takeaway
UAE MoHRE has warned repeatedly (2025–2026 press coverage) about fees charged to candidates, work on visit visas, requests for personal or banking details, and too-good-to-be-true offers. These map directly to filter rules. I found no Europe-specific official guidance this session.

### Cited Findings
- MoHRE: a visit or tourist visa does not allow work, and working on one risks fines and legal action. Legitimate hiring runs through a MoHRE-registered offer, then an electronic work entry permit. — [Gulf News: MoHRE warns UAE jobseekers](https://gulfnews.com/uae/government/mohre-warns-uae-jobseekers-of-fake-job-offers-and-visa-scams-1.500320699), [People Matters ME](https://me.peoplemattersglobal.com/news/recruitment/uaes-mohre-warns-jobseekers-against-fraud-and-working-on-visit-visas-46979)
- Employers must bear recruitment costs. Avoid offers that ask candidates to pay fees, transfer money, or share personal or banking details. — [Khaleej Times](https://www.khaleejtimes.com/jobs/uae-warn-fake-offers-recruitment-scams)
- Warning lures: "Work from home", "No experience needed", "Flexible schedule", unusually high pay. — [Gulf News: High-paying UAE job offer?](https://gulfnews.com/uae/high-paying-uae-job-offer-mohre-warns-job-seekers-about-recruitment-scams-1.500634931)
- Verify the offer number on MoHRE's site or with the UAE embassy, and check employer registration on the National Economic Register. MoHRE contact: +971 6 802 7666, ask@mohre.gov.ae. — [Gulf News](https://gulfnews.com/uae/government/mohre-warns-uae-jobseekers-of-fake-job-offers-and-visa-scams-1.500320699) (contact details as reported in search summary; not verified on mohre.gov.ae)
- Large companies have warned about scams that impersonate them to exploit UAE job demand. — [The National, 2023](https://thenationalnews.com/uae/2023/08/26/major-companies-sound-alarm-over-scams-exploiting-uae-job-demand) (older, 2023)
- Nationality-restricted ads exist ("British nationals based in Dubai"). This is not a scam signal but may make a role ineligible. — [MNC Jobs Gulf](https://mncjobsgulf.com/jobs/spmu-artist-and-beautician-with-sales-expertise-british-nationals-based-in-dubai-dubai-1794847)

**Suggested filter rules** (derived from the above plus common beauty-industry patterns; the beauty-specific items marked * are not sourced):
- Any fee asked of the candidate: visa fee, processing fee, registration fee, deposit, "pay for training/certification/kit"*.
- "Visit visa", "come on visit visa", "tourist visa" combined with work.
- Requests for passport copy, Emirates ID or bank details before an interview or offer; requests to pay via Western Union or crypto.
- "Commission only", "100% commission", "no basic salary"*. "Unpaid trial day(s)" or "free model day"*.
- Gmail/WhatsApp-only contact with no company name or trade licence; agency without a MoHRE licence.
- "No experience needed" for PMU (implausible, since DHA licensing is expected) or unusually high pay.
- "Training provided – course fee deducted from salary"* and academy roles that are really course sales*.

### Inferences
- In Dubai, the absence of a DHA licence requirement in a PMU ad is a soft warning sign that the salon may be operating outside the rules (based on the commercial sources in Q3, not confirmed with DHA).

### Gaps
- MoHRE and u.ae primary pages were not fetched; findings come from press coverage of MoHRE statements.
- No Saudi (HRSD/Musaned), Qatar (MoL), Norway (Arbeidstilsynet), Spain or Poland official scam guidance was retrieved.
- No source quantifies commission-only or unpaid-trial practices in GCC or European beauty salons.
