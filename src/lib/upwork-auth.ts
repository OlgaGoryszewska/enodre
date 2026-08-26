import { createClient } from "@/lib/supabase/server";

// Confirmed against Upwork's own OAuth2 Python SDK source
// (github.com/upwork/python-upwork-oauth2) rather than assumed —
// BASE_HOST + the auth/token URIs it uses internally.
const AUTHORIZE_URL = "https://www.upwork.com/ab/account-security/oauth2/authorize";
const TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";
export const UPWORK_GRAPHQL_URL = "https://api.upwork.com/graphql";

const PROVIDER = "upwork";

// Refresh a bit before actual expiry so a request never races an
// about-to-expire token.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

type StoredToken = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var.`);
  return value;
}

export function getUpworkAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", requireEnv("UPWORK_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv("UPWORK_REDIRECT_URI"));
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    throw new Error(`Upwork token request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function storeTokens(tokens: { access_token: string; refresh_token: string; expires_in: number }) {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await supabase.from("integration_tokens").upsert({
    provider: PROVIDER,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function exchangeCodeForToken(code: string) {
  const tokens = await requestToken({
    grant_type: "authorization_code",
    code,
    client_id: requireEnv("UPWORK_CLIENT_ID"),
    client_secret: requireEnv("UPWORK_CLIENT_SECRET"),
    redirect_uri: requireEnv("UPWORK_REDIRECT_URI"),
  });
  if (!tokens.refresh_token) throw new Error("Upwork token response had no refresh_token.");
  await storeTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: requireEnv("UPWORK_CLIENT_ID"),
    client_secret: requireEnv("UPWORK_CLIENT_SECRET"),
  });
}

export async function isUpworkConnected(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_tokens")
    .select("provider")
    .eq("provider", PROVIDER)
    .maybeSingle();
  return !!data;
}

// Returns a valid access token, refreshing (and persisting) it first if the
// stored one is expired or close to it. Returns null if never connected or
// the refresh itself fails (e.g. the admin revoked access on Upwork's side).
export async function getValidUpworkAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_tokens")
    .select("*")
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Upwork tokens:", error);
    return null;
  }
  if (!data) return null;

  const stored = data as StoredToken;
  const expiresAt = new Date(stored.expires_at).getTime();
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return stored.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(stored.refresh_token);
    await storeTokens({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? stored.refresh_token,
      expires_in: refreshed.expires_in,
    });
    return refreshed.access_token;
  } catch (error) {
    console.error("Failed to refresh Upwork access token:", error);
    return null;
  }
}
