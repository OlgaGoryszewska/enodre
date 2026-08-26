import Link from "next/link";
import { urgencyLabel } from "@/lib/challenge-schema";
import { statusLabels, type Contact } from "@/lib/contact";
import { cn } from "@/lib/utils";

const statusStyles: Record<Contact["status"], string> = {
  new: "bg-accent/15 text-accent",
  contacted: "bg-black/5 text-ink-muted",
  archived: "bg-black/5 text-ink-muted/60",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 p-10 text-center text-sm text-ink-muted">
        No submissions yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-card text-xs uppercase tracking-widest text-ink-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Urgency</th>
              <th className="px-5 py-3 font-medium">Submitted</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-b border-black/10 last:border-b-0 hover:bg-card">
                <td className="px-5 py-4">
                  <Link href={`/admin/${contact.id}`} className="font-semibold hover:underline">
                    {contact.full_name}
                  </Link>
                </td>
                <td className="px-5 py-4 text-ink-muted">{contact.company || "—"}</td>
                <td className="px-5 py-4 text-ink-muted">{contact.email}</td>
                <td className="px-5 py-4 text-ink-muted">{urgencyLabel(contact.urgency)}</td>
                <td className="px-5 py-4 text-ink-muted">{formatDate(contact.created_at)}</td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                      statusStyles[contact.status]
                    )}
                  >
                    {statusLabels[contact.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
