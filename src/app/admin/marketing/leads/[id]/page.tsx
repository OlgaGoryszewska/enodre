import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMailer } from "@/lib/mailer";
import { LeadNotes, LeadProfile } from "@/components/admin/LeadProfile";
import { MessageComposer } from "@/components/admin/MessageComposer";
import { DiscoveryCalls } from "@/components/admin/DiscoveryCalls";
import { LeadResearchPanel } from "@/components/admin/LeadResearchPanel";
import {
  bookDiscoveryCall,
  cancelDiscoveryCall,
  completeDiscoveryCall,
  saveDiscoveryCall,
} from "@/app/admin/marketing/discovery-actions";
import type { DiscoveryCall } from "@/lib/discovery-call";
import {
  deletePotentialCustomer,
  setPotentialCustomerAttitude,
  setPotentialCustomerCallMade,
  setPotentialCustomerMessageSent,
  setPotentialCustomerResponded,
  setPotentialCustomerStatus,
  updatePotentialCustomerDetails,
  updatePotentialCustomerNote,
} from "@/app/admin/marketing/potential-customers-actions";
import {
  addLeadFact,
  approveMessage,
  markLeadMessageSent,
  removeLeadFact,
  recordResponse,
  saveMessageDraft,
  sendLeadEmail,
  stopSequence,
} from "@/app/admin/marketing/outreach-actions";
import { generateOpener, generateOutreachDraft } from "@/app/admin/marketing/outreach-ai-actions";
import { potentialCustomerStatusLabels, segmentLabels, type PotentialCustomer } from "@/lib/potential-customer";
import type { LeadMessage } from "@/lib/outreach-templates";

type LeadPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Potential customer",
};

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: leadData, error: leadError },
    { data: messagesData, error: messagesError },
    { data: callsData, error: callsError },
  ] = await Promise.all([
    supabase.from("potential_customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("lead_messages").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("discovery_calls").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (callsError) {
    // discovery_calls doesn't exist until gtm_command_centre.sql has run.
    console.error("Failed to load discovery calls:", callsError);
  }

  if (leadError) {
    console.error("Failed to load potential customer:", leadError);
  }
  if (messagesError) {
    console.error("Failed to load lead messages:", messagesError);
  }

  if (!leadData) notFound();

  const lead = leadData as PotentialCustomer;
  const messages = (messagesData ?? []) as LeadMessage[];
  const calls = (callsData ?? []) as DiscoveryCall[];

  return (
    <section className="shell py-20 sm:py-28">
      <Link href="/admin/marketing" className="text-sm font-semibold text-ink-muted hover:text-foreground">
        ← Marketing
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {lead.segment && (
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-ink-muted">{segmentLabels[lead.segment]}</span>
          )}
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">
            {potentialCustomerStatusLabels[lead.status]}
          </span>
        </div>
        <h1 className="page-title mt-3 text-2xl">{lead.company || lead.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {[
            lead.company && lead.name !== lead.company ? lead.name : null,
            lead.location,
            lead.employees != null && `${lead.employees} employees`,
          ]
            .filter(Boolean)
            .join(" · ")}
          {lead.website && (
            <>
              {" · "}
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
              >
                Website <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </>
          )}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="grid content-start gap-10">
          <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">Write a message</h2>
            <div className="mt-6">
              <MessageComposer
                leads={[lead]}
                messages={messages}
                onMarkSent={markLeadMessageSent}
                onSendEmail={sendLeadEmail}
                onSaveDraft={saveMessageDraft}
                onApprove={approveMessage}
                onGenerate={generateOutreachDraft}
                onRecordResponse={recordResponse}
                onStopSequence={stopSequence}
                onGenerateOpener={generateOpener}
                senderAddress={getMailer()?.address ?? null}
              />
            </div>
          </div>

          <LeadResearchPanel lead={lead} onAddFact={addLeadFact} onRemoveFact={removeLeadFact} />

          <DiscoveryCalls
            leadId={lead.id}
            calls={calls}
            onBook={bookDiscoveryCall}
            onSave={saveDiscoveryCall}
            onComplete={completeDiscoveryCall}
            onCancel={cancelDiscoveryCall}
          />

          <LeadNotes leadId={lead.id} notes={lead.notes} onSave={updatePotentialCustomerNote} />
        </div>

        <LeadProfile
          lead={lead}
          onSetStatus={setPotentialCustomerStatus}
          onSetMessageSent={setPotentialCustomerMessageSent}
          onSetCallMade={setPotentialCustomerCallMade}
          onSetResponded={setPotentialCustomerResponded}
          onSetAttitude={setPotentialCustomerAttitude}
          onUpdateDetails={updatePotentialCustomerDetails}
          onDelete={deletePotentialCustomer}
        />
      </div>
    </section>
  );
}
