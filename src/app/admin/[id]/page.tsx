import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { urgencyLabel } from "@/lib/challenge-schema";
import { STATUS_VALUES, statusLabels, type Contact } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";
import { updateContactStatus } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type ContactPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Contact",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ContactDetailPage({ params }: ContactPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("Failed to load contact:", error);
  }

  if (!data) notFound();

  const contact = data as Contact;
  const updateStatus = updateContactStatus.bind(null, contact.id);

  return (
    <section className="shell py-20 sm:py-28">
      <Link href="/admin" className="text-sm font-semibold text-ink-muted hover:text-foreground">
        ← All submissions
      </Link>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="eyebrow">{urgencyLabel(contact.urgency)}</p>
          <h1 className="page-title mt-4 text-4xl">{contact.full_name}</h1>
          <p className="mt-2 text-ink-muted">
            {contact.email}
            {contact.company && ` · ${contact.company}`}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Submitted {formatDateTime(contact.created_at)} · Updated {formatDateTime(contact.updated_at)}
          </p>

          <div className="mt-10 grid gap-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
                What challenge are they facing?
              </h2>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-foreground">{contact.challenge}</p>
            </div>

            {contact.success_looks_like && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
                  What would success look like?
                </h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-foreground">
                  {contact.success_looks_like}
                </p>
              </div>
            )}

            {contact.anything_else && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
                  Anything else?
                </h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-foreground">{contact.anything_else}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-black/10 bg-card p-8">
          <h2 className="font-semibold">Status</h2>
          <p className="mt-2 text-sm text-ink-muted">Currently {statusLabels[contact.status]}.</p>
          <form action={updateStatus} className="mt-6 grid gap-3">
            {STATUS_VALUES.map((status) => (
              <label
                key={status}
                htmlFor={`status-${status}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-150",
                  contact.status === status
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-black/10 text-ink-muted hover:border-black/25 hover:text-foreground"
                )}
              >
                <input
                  id={`status-${status}`}
                  type="radio"
                  name="status"
                  value={status}
                  defaultChecked={contact.status === status}
                  className="h-4 w-4 accent-accent"
                />
                {statusLabels[status]}
              </label>
            ))}
            <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "mt-2 w-full")}>
              Update status
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}
