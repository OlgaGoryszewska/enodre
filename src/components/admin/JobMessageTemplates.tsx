import { Mail } from "lucide-react";
import { Accordion } from "@/components/admin/Accordion";
import {
  COMPANY_TEMPLATES,
  JOB_TEMPLATES,
  RECRUITER_TEMPLATES,
  type MessageTemplate,
} from "@/lib/job-message-templates";

const GROUPS: { title: string; templates: MessageTemplate[] }[] = [
  { title: "Recruiters", templates: RECRUITER_TEMPLATES },
  { title: "Companies", templates: COMPANY_TEMPLATES },
  { title: "Job applications", templates: JOB_TEMPLATES },
];

/** Reference: every message sent while applying for jobs, to read and check. */
export function JobMessageTemplates() {
  return (
    <Accordion
      icon={<Mail className="h-4 w-4" aria-hidden="true" />}
      title="Message templates"
      subtitle="What recruiters, companies and job ads receive"
    >
      <p className="text-sm text-ink-muted">
        The exact wording that goes out, with sample details: [Company] and [Job title] are filled in for each message.
        All of them go from olga.goryszewska@gmail.com with your CV attached.
      </p>
      <div className="mt-5 grid gap-6">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{group.title}</h3>
            <div className="mt-2 grid gap-2">
              {group.templates.map((template) => (
                <details key={template.name} className="rounded-xl border border-black/10 bg-background p-4 text-sm">
                  <summary className="cursor-pointer font-semibold">{template.name}</summary>
                  <p className="mt-1 text-xs text-ink-muted">{template.when}</p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {template.versions.map((version) => (
                      <div key={version.language}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                          {version.language}
                        </p>
                        <p className="mt-1 text-xs">
                          <span className="text-ink-muted">Subject:</span> {version.subject}
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 font-sans text-xs leading-5">
                          {version.body}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Accordion>
  );
}
