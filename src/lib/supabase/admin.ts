import { createClient } from "@supabase/supabase-js";

// Service-role client for scheduled jobs (no user session). It bypasses RLS,
// so it's used only on the server, in the cron route — never in a component.
// Needs SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY isn't set — the scheduled job agent can't run.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
