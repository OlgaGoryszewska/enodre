import { FIXED_DETAILS } from "./job-profile.ts";

// Which answer goes in which form field, and which buttons the form filler may
// press. Pure, so it's unit-tested; scripts/apply-assistant.mts drives Chrome.

export type Applicant = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin: string;
  github: string;
  portfolio: string;
  currentTitle: string;
  yearsExperience: string;
  languages: string;
  education: string;
  /** From My details on Find jobs: notice_period, salary_norway, work_permit … */
  answers: Record<string, string>;
};

export type FieldAnswer = { text: string } | { file: "cv" } | { coverLetter: true } | null;

// Most specific first: "LinkedIn profile URL" is LinkedIn, not "URL".
const RULES: [RegExp, (a: Applicant, country: string) => FieldAnswer][] = [
  [/(resume|\bcv\b|curriculum|attach (your )?cv|last opp cv|cv-?fil|upload.*(cv|resume))/i, () => ({ file: "cv" })],
  [
    /(cover ?letter|motivation|søknadstekst|søknadsbrev|personlig brev|why (do you want|are you)|message to|tell us about yourself|additional information|om deg selv|list motywacyjny)/i,
    () => ({ coverLetter: true }),
  ],
  [/(first ?name|given name|fornavn|imię|nombre(?! completo))/i, (a) => ({ text: a.firstName })],
  [/(last ?name|surname|family name|etternavn|nazwisko|apellido)/i, (a) => ({ text: a.lastName })],
  [
    /(full ?name|^name$|your name|navn$|^navn|fullt navn|nombre completo|imię i nazwisko)/i,
    (a) => ({ text: `${a.firstName} ${a.lastName}` }),
  ],
  [/(e-?mail|e-?post)/i, (a) => ({ text: a.email })],
  [/(phone|mobile|telefon|mobil|tlf|número de teléfono|whatsapp)/i, (a) => ({ text: a.phone })],
  [/linked ?in/i, (a) => ({ text: a.linkedin })],
  [/git ?hub/i, (a) => ({ text: a.github })],
  [/(portfolio|website|personal (site|url)|nettside|hjemmeside|url)/i, (a) => ({ text: a.portfolio })],
  [
    /(salary|lønn|lønnsforventning|wynagrodzeni|salario|compensation|pay expectation)/i,
    (a, country) => {
      const value = country === "Norway" ? a.answers.salary_norway : a.answers.salary_abroad || a.answers.salary_norway;
      return value ? { text: value } : null;
    },
  ],
  [
    /(notice period|oppsigelsestid|start date|available from|tiltredelse|når kan du starte|earliest start|okres wypowiedzenia|disponibilidad)/i,
    (a) => (a.answers.notice_period ? { text: a.answers.notice_period } : null),
  ],
  [
    /(work permit|right to work|authori[sz]ed to work|visa|sponsorship|arbeidstillatelse|citizenship|statsborgerskap)/i,
    (a) => (a.answers.work_permit ? { text: a.answers.work_permit } : null),
  ],
  [/(relocat|flytte)/i, (a) => (a.answers.relocation ? { text: a.answers.relocation } : null)],
  [/(remote|hybrid|hjemmekontor)/i, (a) => (a.answers.remote ? { text: a.answers.remote } : null)],
  [
    /(years of experience|år(s)? erfaring|how many years|lata doświadczenia|años de experiencia)/i,
    (a) => ({ text: a.yearsExperience }),
  ],
  [/(current (job )?title|nåværende stilling|current position|headline)/i, (a) => ({ text: a.currentTitle })],
  [/(languages|språk|języki|idiomas)/i, (a) => ({ text: a.languages })],
  [/(education|utdanning|degree|wykształcenie|estudios)/i, (a) => ({ text: a.education })],
  [/(city|town|by$|bosted|poststed|miasto|ciudad|location|address|adresse)/i, (a) => ({ text: a.city })],
  [/(country|land$|kraj|país)/i, (a) => ({ text: a.country })],
  [
    /(why (you|should we)|good fit|pitch|hvorfor (deg|oss)|kort om deg)/i,
    (a) => (a.answers.why_me ? { text: a.answers.why_me } : null),
  ],
];

// Never answered for you: you decide these yourself.
const NEVER =
  /(password|passord|captcha|social security|personnummer|fødselsnummer|date of birth|fødselsdato|bank|iban|card|gender|kjønn|ethnic|race|disabilit|veteran|religion|signature|consent|samtykke|i agree|terms|privacy|gdpr)/i;

/** The answer for a field, from its label text (label, placeholder, name). Null: leave it for you. */
export function answerFor(label: string, applicant: Applicant, jobCountry = "Norway"): FieldAnswer {
  const text = label.replace(/\s+/g, " ").trim();
  if (!text || NEVER.test(text)) return null;
  for (const [pattern, answer] of RULES) if (pattern.test(text)) return answer(applicant, jobCountry);
  return null;
}

const normal = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** The final button: the filler never presses it, you do. */
export function isSubmitButton(text: string) {
  return /(submit|send (inn|application|søknad|my application)|^send$|^sende|send søknad|sende søknad|wyślij|enviar|confirm( and send)?|bekreft og send|fullfør søknad|complete application|apply now and send)/i.test(
    normal(text)
  );
}

/** Buttons that open the application form from the ad. */
export function isStartButton(text: string) {
  const value = normal(text);
  if (isSubmitButton(value)) return false;
  return /^(easy apply|apply|apply now|apply for this (job|position|role)|apply on company (site|website)|søk|søk her|søk nå|søk på stillingen|søk på jobben|send søknad her|aplikuj|aplikuj teraz|inscribirme|postularme|solicitar)$/i.test(
    value
  );
}

/** "Next" between steps of a multi-page form (LinkedIn Easy Apply, Workday …). */
export function isNextButton(text: string) {
  const value = normal(text);
  if (isSubmitButton(value)) return false;
  return /^(next|continue|neste|fortsett|gå videre|review|review your application|dalej|siguiente|continuar)$/i.test(
    value
  );
}

/** Where a job is applied, for the terminal summary. */
export function formSite(url: string) {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const known: [RegExp, string][] = [
    [/linkedin\./, "LinkedIn"],
    [/indeed\./, "Indeed"],
    [/teamtailor/, "Teamtailor"],
    [/greenhouse/, "Greenhouse"],
    [/lever\.co/, "Lever"],
    [/workable/, "Workable"],
    [/recruitee/, "Recruitee"],
    [/jobylon/, "Jobylon"],
    [/webcruiter/, "Webcruiter"],
    [/myworkday|workday/, "Workday"],
    [/smartrecruiters/, "SmartRecruiters"],
    [/arbeidsplassen\.nav/, "NAV"],
    [/finn\.no/, "FINN"],
  ];
  return known.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

// --- The "Fill my application" bookmark ----------------------------------

const detail = (label: string) => FIXED_DETAILS.find((item) => item.label === label)?.value ?? "";

/** You, from My details: the fixed details from your CV plus your saved answers. */
export function applicantFromProfile(answers: Record<string, string>): Applicant {
  const city = detail("City");
  return {
    firstName: detail("First name"),
    lastName: detail("Last name"),
    email: detail("Email"),
    phone: detail("Phone"),
    city: city.split(",")[0]?.trim() ?? city,
    country: city.split(",")[1]?.trim() ?? "Norway",
    linkedin: detail("LinkedIn"),
    github: detail("GitHub"),
    portfolio: detail("Portfolio"),
    currentTitle: detail("Current title"),
    yearsExperience: "3",
    languages: detail("Languages"),
    education: detail("Education"),
    answers,
  };
}

/**
 * The rules with your answers filled in, for code running in a page: pattern,
 * then what to put there. "cv" and "cover" are never typed: the bookmark marks
 * those fields for you instead.
 */
export function fillPlan(applicant: Applicant, country = "Norway") {
  return {
    never: NEVER.source,
    rules: RULES.map(([pattern, answer]) => {
      const value = answer(applicant, country);
      const kind = value === null ? "skip" : "file" in value ? "cv" : "coverLetter" in value ? "cover" : "text";
      return [pattern.source, kind, value && "text" in value ? value.text : ""] as const;
    }),
  };
}

/**
 * A bookmark that fills the form on the page you're on, when you click it.
 * It only types into empty fields: it never clicks, never goes to the next
 * step and never submits. Works on LinkedIn Easy Apply, Indeed and company forms.
 */
export function bookmarkletFor(plan: ReturnType<typeof fillPlan>) {
  const code = `(()=>{const P=${JSON.stringify(plan)};const never=new RegExp(P.never,"i");const rules=P.rules.map(([s,k,v])=>[new RegExp(s,"i"),k,v]);
const docs=[document];for(const f of document.querySelectorAll("iframe")){try{if(f.contentDocument)docs.push(f.contentDocument)}catch(e){}}
const labelOf=(el,d)=>{const parts=[];if(el.id){const l=d.querySelector('label[for="'+CSS.escape(el.id)+'"]');if(l)parts.push(l.innerText)}const wrap=el.closest("label");if(wrap)parts.push(wrap.innerText);const by=el.getAttribute("aria-labelledby");if(by)for(const id of by.split(" ")){const n=d.getElementById(id);if(n)parts.push(n.innerText)}parts.push(el.getAttribute("aria-label")||"",el.placeholder||"",el.name||"",el.id||"");if(parts.join("").trim().length<3){const box=el.closest("div,fieldset,li");if(box)parts.push((box.innerText||"").slice(0,120))}return parts.join(" ").replace(/\\s+/g," ").trim()};
const setValue=(el,v)=>{const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const set=Object.getOwnPropertyDescriptor(proto,"value").set;set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));el.dispatchEvent(new Event("blur",{bubbles:true}))};
let filled=0,yours=0;const notes=[];
for(const d of docs)for(const el of d.querySelectorAll("input,textarea")){const t=(el.type||"text").toLowerCase();if(["hidden","submit","button","checkbox","radio","password","image","reset","search"].includes(t))continue;if(el.disabled||el.readOnly||el.offsetParent===null)continue;
const label=labelOf(el,d);if(!label||never.test(label))continue;const rule=rules.find(([r])=>r.test(label));if(!rule)continue;const[,kind,value]=rule;
if(kind==="cv"||kind==="cover"||t==="file"){el.style.outline="3px solid #e4569a";yours++;notes.push(kind==="cover"?"cover letter":"CV");continue}
if(kind!=="text"||!value||el.value)continue;setValue(el,value);el.style.outline="2px solid #b0125b";filled++}
const box=document.createElement("div");box.textContent="Filled "+filled+" field"+(filled===1?"":"s")+(yours?". Pink-outlined: add your "+[...new Set(notes)].join(" and ")+" yourself":"")+". Check everything, then press Next or Submit yourself.";
Object.assign(box.style,{position:"fixed",zIndex:2147483647,top:"16px",right:"16px",maxWidth:"360px",background:"#b0125b",color:"#fff",padding:"12px 16px",borderRadius:"14px",font:"600 14px/1.4 system-ui,sans-serif",boxShadow:"0 8px 24px rgba(0,0,0,.2)"});document.body.appendChild(box);setTimeout(()=>box.remove(),7000)})()`;
  return `javascript:${encodeURIComponent(code)}`;
}
