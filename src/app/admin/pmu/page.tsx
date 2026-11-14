import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { PmuAgent, type PmuPosting, type PmuRun } from "@/components/admin/PmuAgent";
import { createClient } from "@/lib/supabase/server";
import type { PmuProfile, PmuTarget } from "@/lib/pmu-agent";
import type { PmuActivity } from "@/lib/pmu-tracking";
import { GULF_COUNTRIES } from "@/lib/email-replies";

// Job ads from the Gulf, saved before it left the search.
const GULF_JOB = /(riyadh|dubai|doha|jeddah|abu dhabi|gcc|bayt|naukrigulf|gulftalent|qureos)/i;
import {
  addPmuTarget,
  deletePmuActivity,
  logPmuActivity,
  savePmuOffer,
  setPmuNextStep,
  setPmuFavourite,
  setPmuTargetHidden,
  runPmuAgentNow,
  savePmuProfile,
  setPmuPostingStatus,
  updatePmuTarget,
} from "@/app/admin/pmu/actions";

export const metadata: Metadata = { title: "PMU jobs" };

// "Search now" reads a few dozen pages and can take a couple of minutes.
export const maxDuration = 300;

export default async function PmuPage() {
  const supabase = await createClient();
  const [targets, profile, postings, runs, activity] = await Promise.all([
    supabase.from("pmu_targets").select("*"),
    supabase.from("pmu_profile").select("key, value"),
    supabase
      .from("pmu_postings")
      .select("*")
      .neq("status", "dismissed")
      .order("score", { ascending: false })
      .limit(100),
    supabase
      .from("pmu_runs")
      .select("id, created_at, trigger, report")
      .order("created_at", { ascending: false })
      .limit(10),
    // Every step with every place (missing until pmu_agent.sql has run again).
    supabase.from("pmu_activity").select("id, target_id, kind, at, note").order("at", { ascending: true }).limit(5000),
  ]);

  return (
    <section className="pmu-theme shell py-20 sm:py-28">
      <AdminNav />
      <div className="mt-8">
        <PmuAgent
          targets={((targets.data ?? []) as PmuTarget[]).filter((target) => !GULF_COUNTRIES.includes(target.country))}
          profile={Object.fromEntries((profile.data ?? []).map((row) => [row.key, row.value])) as PmuProfile}
          setupMissing={Boolean(targets.error)}
          postings={((postings.data ?? []) as PmuPosting[]).filter(
            (posting) => !GULF_JOB.test(`${posting.location} ${posting.company}`)
          )}
          runs={(runs.data ?? []) as PmuRun[]}
          onRun={runPmuAgentNow}
          onSetPostingStatus={setPmuPostingStatus}
          onUpdate={updatePmuTarget}
          activities={(activity.data ?? []) as PmuActivity[]}
          onLog={logPmuActivity}
          onDeleteActivity={deletePmuActivity}
          onSetNextStep={setPmuNextStep}
          onSaveOffer={savePmuOffer}
          onSetHidden={setPmuTargetHidden}
          onSetFavourite={setPmuFavourite}
          onAdd={addPmuTarget}
          onSaveProfile={savePmuProfile}
        />
      </div>
    </section>
  );
}
